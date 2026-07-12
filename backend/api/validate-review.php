<?php
/**
 * API pour valider ou refuser un avis client (POST JSON)
 * Rôles requis : 'employe' / 'admin'
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

// Rôles restreints
requireRoles(['employe', 'admin']);

$inputData = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$inputData) {
    sendResponse("error", "Méthode non autorisée.", [], 400);
}

$reviewId = isset($inputData['review_id']) ? intval($inputData['review_id']) : 0;
$action = trim($inputData['action'] ?? ''); // 'validate' ou 'reject'

if ($reviewId <= 0 || !in_array($action, ['validate', 'reject'])) {
    sendResponse("error", "ID d'avis ou action invalide.", [], 400);
}

$db = Database::getInstance()->getConnection();

try {
    // Vérifier l'existence de l'avis
    $stmtCheck = $db->prepare("SELECT id FROM reviews WHERE id = :id");
    $stmtCheck->execute(['id' => $reviewId]);
    if (!$stmtCheck->fetch()) {
        sendResponse("error", "Avis non trouvé.", [], 404);
    }

    if ($action === 'validate') {
        // Valider l'avis
        $stmt = $db->prepare("UPDATE reviews SET is_validated = 1 WHERE id = :id");
        $stmt->execute(['id' => $reviewId]);
        $message = "L'avis client a été validé avec succès et est maintenant visible sur la page d'accueil.";
    } else {
        // Refuser (supprimer de la base)
        $stmt = $db->prepare("DELETE FROM reviews WHERE id = :id");
        $stmt->execute(['id' => $reviewId]);
        $message = "L'avis client a été refusé et supprimé.";
    }

    sendResponse("success", $message);

} catch (PDOException $e) {
    sendResponse("error", "Une erreur technique est survenue.", ["debug" => $e->getMessage()], 500);
}
