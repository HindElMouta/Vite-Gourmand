<?php
/**
 * API de mise à jour du statut d'une commande (POST JSON)
 * Règles métier :
 * 1. Utilisateur peut annuler (status = 'annulee') si le statut actuel est 'en_attente'.
 * 2. Employé / Admin peut changer le statut. S'il s'agit d'une annulation par l'employé, 
 *    les champs 'cancellation_reason' et 'cancellation_contact_method' (GSM/mail) sont OBLIGATOIRES.
 * 3. Si passage au statut 'retour_materiel' : envoi d'un mail d'alerte pour restitution sous 10 jours sous peine d'une amende de 600€.
 * 4. Si passage au statut 'terminee' : envoi d'un mail invitant à laisser un avis (note de 1 à 5 et commentaire).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/mongodb.php';
require_once __DIR__ . '/../utils/helpers.php';

requireLogin();

$inputData = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$inputData) {
    sendResponse("error", "Méthode non autorisée ou données invalides.", [], 400);
}

$orderId = isset($inputData['order_id']) ? intval($inputData['order_id']) : 0;
$newStatus = trim($inputData['status'] ?? '');
$cancellationReason = trim($inputData['cancellation_reason'] ?? '');
$cancellationContactMethod = trim($inputData['cancellation_contact_method'] ?? '');

if ($orderId <= 0 || empty($newStatus)) {
    sendResponse("error", "ID de commande et nouveau statut obligatoires.", [], 400);
}

// Liste des statuts valides
$validStatuses = ['en_attente', 'acceptee', 'preparation', 'livraison', 'livree', 'retour_materiel', 'terminee', 'annulee'];
if (!in_array($newStatus, $validStatuses)) {
    sendResponse("error", "Le statut demandé est invalide.", [], 400);
}

$userId = $_SESSION['user_id'];
$userRole = $_SESSION['user_role'];

$db = Database::getInstance()->getConnection();

try {
    // 1. Récupérer la commande actuelle
    $stmt = $db->prepare("SELECT * FROM orders WHERE id = :id");
    $stmt->execute(['id' => $orderId]);
    $order = $stmt->fetch();

    if (!$order) {
        sendResponse("error", "Commande non trouvée.", [], 404);
    }

    $currentStatus = $order['status'];

    // 2. Vérification des autorisations et règles d'annulation
    if ($userRole === 'utilisateur') {
        // L'utilisateur ne peut modifier que SA commande
        if ($order['user_id'] != $userId) {
            sendResponse("error", "Vous n'avez pas l'autorisation d'accéder à cette commande.", [], 403);
        }

        // L'utilisateur ne peut qu'annuler
        if ($newStatus !== 'annulee') {
            sendResponse("error", "Vous pouvez uniquement annuler votre commande.", [], 403);
        }

        // L'annulation n'est possible que si la commande n'est pas encore acceptée
        if ($currentStatus !== 'en_attente') {
            sendResponse("error", "Impossible d'annuler cette commande car elle a déjà été acceptée par l'équipe.", [], 400);
        }
    } else {
        // Rôle employé ou admin
        // Si l'employé annule la commande, il doit obligatoirement avoir contacté le client
        if ($newStatus === 'annulee') {
            if (empty($cancellationReason) || empty($cancellationContactMethod)) {
                sendResponse("error", "Pour annuler une commande, vous devez obligatoirement contacter le client et renseigner le motif d'annulation ainsi que le mode de contact (GSM ou email).", [], 400);
            }
        }
    }

    // Début de la transaction
    $db->beginTransaction();

    // 3. Mettre à jour la commande
    $updateQuery = "UPDATE orders SET status = :status, updated_at = NOW()";
    $updateParams = ['status' => $newStatus, 'id' => $orderId];

    if ($userRole !== 'utilisateur' && $newStatus === 'annulee') {
        $updateQuery .= ", cancellation_reason = :reason, cancellation_contact_method = :contact";
        $updateParams['reason'] = $cancellationReason;
        $updateParams['contact'] = $cancellationContactMethod;
    }

    $updateQuery .= " WHERE id = :id";
    $stmtUpdate = $db->prepare($updateQuery);
    $stmtUpdate->execute($updateParams);

    // 4. Enregistrer dans l'historique
    $stmtHistory = $db->prepare("INSERT INTO order_status_history (order_id, status) VALUES (:order_id, :status)");
    $stmtHistory->execute(['order_id' => $orderId, 'status' => $newStatus]);

    // 5. Si la commande est annulée, on recrédite le stock du menu associé
    if ($newStatus === 'annulee' && $currentStatus !== 'annulee') {
        $stmtStock = $db->prepare("UPDATE menus SET stock = stock + 1 WHERE id = :menu_id");
        $stmtStock->execute(['menu_id' => $order['menu_id']]);
    }

    $db->commit();

    // Mettre à jour MongoDB
    $nosql = MongoDBConn::getInstance();
    // On met à jour ou recrée un document d'analytics
    $nosql->insert('order_analytics_updates', [
        'order_id' => intval($orderId),
        'old_status' => $currentStatus,
        'new_status' => $newStatus,
        'updated_at' => date('c')
    ]);

    // 6. Gestion des e-mails en fonction du nouveau statut
    $clientEmail = $order['client_email'];
    $clientFirstName = $order['client_first_name'];

    if ($newStatus === 'retour_materiel') {
        // Envoi de l'e-mail d'alerte pour le matériel
        $subject = "Restitution du matériel prêté - Vite & Gourmand (#$orderId)";
        $body = "Bonjour $clientFirstName,\n\n";
        $body .= "Votre événement est terminé et nous espérons que vous et vos convives avez passé un excellent moment.\n\n";
        $body .= "Nous vous rappelons que du matériel professionnel vous a été prêté pour cette prestation.\n";
        $body .= "Conformément à nos conditions générales de vente, vous disposez de 10 jours ouvrés à compter de ce jour pour le restituer.\n\n";
        $body .= "IMPORTANT : Passé ce délai de 10 jours ouvrés, des frais de non-restitution de 600,00 € vous seront facturés.\n\n";
        $body .= "Pour convenir d'un rendez-vous de restitution, veuillez prendre contact avec notre société en répondant à ce mail ou en nous appelant au 06 87 65 43 21.\n\n";
        $body .= "Cordialement,\n";
        $body .= "Julie & José - Vite & Gourmand.";

        sendMockEmail($clientEmail, $subject, $body);

    } elseif ($newStatus === 'terminee') {
        // Envoi de l'e-mail pour déposer un avis
        $subject = "Donnez votre avis sur votre buffet - Vite & Gourmand (#$orderId)";
        $body = "Bonjour $clientFirstName,\n\n";
        $body .= "Votre commande #$orderId est désormais marquée comme terminée. Nous espérons que le repas vous a plu !\n\n";
        $body .= "Nous vous invitons à vous connecter à votre compte client pour nous laisser une note (de 1 à 5) et un commentaire sur votre expérience.\n";
        $body .= "Votre avis est précieux pour nous aider à faire évoluer nos menus et à accroître notre visibilité à Bordeaux.\n\n";
        $body .= "Pour déposer votre avis, connectez-vous et rendez-vous dans votre Espace Client.\n\n";
        $body .= "À très bientôt pour vos prochains événements,\n";
        $body .= "L'équipe Vite & Gourmand.";

        sendMockEmail($clientEmail, $subject, $body);
    }

    sendResponse("success", "Statut de la commande mis à jour avec succès.", ["new_status" => $newStatus]);

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    sendResponse("error", "Une erreur technique est survenue.", ["debug" => $e->getMessage()], 500);
}
