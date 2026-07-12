<?php
/**
 * API pour créer une commande de menu (POST JSON)
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/mongodb.php';
require_once __DIR__ . '/../utils/helpers.php';

// Authentification requise
requireLogin();

$inputData = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$inputData) {
    sendResponse("error", "Méthode non autorisée ou données invalides.", [], 400);
}

$menuId = isset($inputData['menu_id']) ? intval($inputData['menu_id']) : 0;
$guestCount = isset($inputData['guest_count']) ? intval($inputData['guest_count']) : 0;
$deliveryAddress = trim($inputData['delivery_address'] ?? '');
$deliveryDate = trim($inputData['delivery_date'] ?? '');
$deliveryTime = trim($inputData['delivery_time'] ?? '');
$phone = trim($inputData['phone'] ?? '');

// Récupérer les informations client depuis la session pour plus de sécurité
$userId = $_SESSION['user_id'];
$clientLastName = $_SESSION['user_last_name'];
$clientFirstName = $_SESSION['user_first_name'];
$clientEmail = $_SESSION['user_email'];

// Paramètres de livraison en dehors de Bordeaux
$isOutsideBordeaux = isset($inputData['is_outside_bordeaux']) ? (bool)$inputData['is_outside_bordeaux'] : false;
$distanceKm = isset($inputData['distance_km']) ? floatval($inputData['distance_km']) : 0.0;

// Validations de base
if ($menuId <= 0 || $guestCount <= 0 || empty($deliveryAddress) || empty($deliveryDate) || empty($deliveryTime) || empty($phone)) {
    sendResponse("error", "Veuillez remplir toutes les informations requises pour la prestation.", [], 400);
}

$db = Database::getInstance()->getConnection();

try {
    // 1. Récupérer les informations du menu
    $stmtMenu = $db->prepare("SELECT * FROM menus WHERE id = :id");
    $stmtMenu->execute(['id' => $menuId]);
    $menu = $stmtMenu->fetch();

    if (!$menu) {
        sendResponse("error", "Le menu sélectionné n'existe pas.", [], 404);
    }

    // 2. Vérifier le stock disponible
    if ($menu['stock'] <= 0) {
        sendResponse("error", "Ce menu est temporairement en rupture de stock.", [], 400);
    }

    // 3. Vérifier le nombre minimal de personnes
    $minPax = intval($menu['min_people']);
    if ($guestCount < $minPax) {
        sendResponse("error", "Le nombre de personnes minimum pour ce menu est de {$minPax}.", [], 400);
    }

    // 4. Calculer la réduction de 10%
    // La réduction s'applique si la commande comporte au moins 5 personnes de plus que le minimum requis
    $discountAmount = 0.00;
    $menuUnitPrice = floatval($menu['base_price']);
    $baseTotalMenu = $menuUnitPrice * $guestCount;

    if ($guestCount >= ($minPax + 5)) {
        $discountAmount = $baseTotalMenu * 0.10;
    }

    // 5. Calculer les frais de livraison
    // Si la livraison n'est pas dans Bordeaux, facturer 5€ + 0.59€ par km
    $deliveryPrice = 0.00;
    if ($isOutsideBordeaux && $distanceKm > 0) {
        $deliveryPrice = 5.00 + (0.59 * $distanceKm);
    }

    // 6. Calculer le total final
    $totalPrice = $baseTotalMenu - $discountAmount + $deliveryPrice;

    // Début de la transaction SQL
    $db->beginTransaction();

    // 7. Insérer la commande
    $stmtInsert = $db->prepare("
        INSERT INTO orders (
            user_id, client_last_name, client_first_name, client_email, client_phone, 
            delivery_address, delivery_date, delivery_time, menu_id, guest_count, 
            menu_unit_price, delivery_price, discount_amount, total_price, status
        ) VALUES (
            :user_id, :last_name, :first_name, :email, :phone, 
            :address, :date, :time, :menu_id, :guest_count, 
            :unit_price, :delivery_price, :discount_amount, :total_price, 'en_attente'
        )
    ");
    
    $stmtInsert->execute([
        'user_id' => $userId,
        'last_name' => $clientLastName,
        'first_name' => $clientFirstName,
        'email' => $clientEmail,
        'phone' => $phone,
        'address' => $deliveryAddress,
        'date' => $deliveryDate,
        'time' => $deliveryTime,
        'menu_id' => $menuId,
        'guest_count' => $guestCount,
        'unit_price' => $menuUnitPrice,
        'delivery_price' => $deliveryPrice,
        'discount_amount' => $discountAmount,
        'total_price' => $totalPrice
    ]);
    
    $orderId = $db->lastInsertId();

    // 8. Mettre à jour le stock du menu (décrémenter de 1)
    $stmtStock = $db->prepare("UPDATE menus SET stock = stock - 1 WHERE id = :menu_id");
    $stmtStock->execute(['menu_id' => $menuId]);

    // 9. Ajouter l'historique de statut initial
    $stmtHistory = $db->prepare("INSERT INTO order_status_history (order_id, status) VALUES (:order_id, 'en_attente')");
    $stmtHistory->execute(['order_id' => $orderId]);

    // Valider la transaction SQL
    $db->commit();

    // 10. Insérer les statistiques dans MongoDB (NoSQL) pour reporting admin
    $nosql = MongoDBConn::getInstance();
    $nosql->insert('order_analytics', [
        'order_id' => intval($orderId),
        'menu_id' => intval($menuId),
        'menu_title' => $menu['title'],
        'theme' => $menu['theme'],
        'regime' => $menu['regime'],
        'guest_count' => intval($guestCount),
        'revenue' => floatval($totalPrice),
        'delivery_fee' => floatval($deliveryPrice),
        'discount_applied' => floatval($discountAmount),
        'order_date' => date('c'),
        'status' => 'en_attente'
    ]);

    // 11. Envoyer le mail de confirmation de commande
    $subject = "Confirmation de votre commande - Vite & Gourmand (#$orderId)";
    $body = "Bonjour $clientFirstName,\n\n";
    $body .= "Nous vous remercions pour votre commande chez Vite & Gourmand ! Elle est en attente de validation par notre équipe.\n\n";
    $body .= "Récapitulatif de la prestation :\n";
    $body .= "- Commande ID : #$orderId\n";
    $body .= "- Menu choisi : " . $menu['title'] . "\n";
    $body .= "- Nombre de personnes : $guestCount\n";
    $body .= "- Date de livraison : $deliveryDate à $deliveryTime\n";
    $body .= "- Adresse de livraison : $deliveryAddress\n";
    $body .= "------------------------------------------------------------\n";
    $body .= "- Prix du menu : " . number_format($baseTotalMenu, 2) . " €\n";
    if ($discountAmount > 0) {
        $body .= "- Réduction de groupe (10%) : -" . number_format($discountAmount, 2) . " €\n";
    }
    $body .= "- Frais de livraison : " . number_format($deliveryPrice, 2) . " €\n";
    $body .= "- Total TTC Estimé : " . number_format($totalPrice, 2) . " €\n\n";
    $body .= "Vous recevrez un nouvel e-mail dès que la commande aura été acceptée.\n\n";
    $body .= "À très bientôt,\n";
    $body .= "L'équipe Vite & Gourmand.\n";

    sendMockEmail($clientEmail, $subject, $body);

    sendResponse("success", "Votre commande a été enregistrée avec succès !", ["order_id" => $orderId]);

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    sendResponse("error", "Erreur technique lors de la création de la commande.", ["debug" => $e->getMessage()], 500);
}
