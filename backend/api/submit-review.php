<?php
/**
 * API pour soumettre un avis client sur une commande (POST JSON)
 * Règles métier :
 * - L'utilisateur doit être connecté.
 * - La commande doit lui appartenir.
 * - La commande doit être au statut 'terminee'.
 * - La note doit être comprise entre 1 et 5.
 * - L'avis est créé avec 'is_validated = 0' (validation par un employé requise).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

requireLogin();

$inputData = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$inputData) {
    sendResponse("error", "Méthode non autorisée.", [], 400);
}

$orderId = isset($inputData['order_id']) ? intval($inputData['order_id']) : 0;
$rating = isset($inputData['rating']) ? intval($inputData['rating']) : 0;
$comment = trim($inputData['comment'] ?? '');

if ($orderId <= 0 || $rating < 1 || $rating > 5 || empty($comment)) {
    sendResponse("error", "Veuillez fournir une note de 1 à 5 et un commentaire.", [], 400);
}

$userId = $_SESSION['user_id'];
$db = Database::getInstance()->getConnection();

try {
    // 1. Vérifier que la commande existe, appartient à l'utilisateur et est terminée
    $stmtOrder = $db->prepare("SELECT status, user_id FROM orders WHERE id = :id");
    $stmtOrder->execute(['id' => $orderId]);
    $order = $stmtOrder->fetch();

    if (!$order) {
        sendResponse("error", "Commande non trouvée.", [], 404);
    }

    if ($order['user_id'] != $userId) {
        sendResponse("error", "Vous n'avez pas l'autorisation d'évaluer cette commande.", [], 403);
    }

    if ($order['status'] !== 'terminee') {
        sendResponse("error", "Vous pouvez laisser un avis uniquement lorsque votre commande est marquée comme terminée.", [], 400);
    }

    // 2. Vérifier si un avis a déjà été soumis pour cette commande (contrainte unique)
    $stmtCheck = $db->prepare("SELECT id FROM reviews WHERE order_id = :order_id");
    $stmtCheck->execute(['order_id' => $orderId]);
    if ($stmtCheck->fetch()) {
        sendResponse("error", "Vous avez déjà soumis un avis pour cette commande.", [], 409);
    }

    // 3. Insérer l'avis client
    $stmtInsert = $db->prepare("
        INSERT INTO reviews (order_id, user_id, rating, comment, is_validated) 
        VALUES (:order_id, :user_id, :rating, :comment, 0)
    ");
    $stmtInsert->execute([
        'order_id' => $orderId,
        'user_id' => $userId,
        'rating' => $rating,
        'comment' => $comment
    ]);

    sendResponse("success", "Votre avis a été soumis avec succès ! Il sera affiché sur le site après validation par notre équipe.");

} catch (PDOException $e) {
    sendResponse("error", "Une erreur technique est survenue lors de l'enregistrement de l'avis.", ["debug" => $e->getMessage()], 500);
}
