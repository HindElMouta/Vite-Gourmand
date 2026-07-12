<?php
/**
 * API pour récupérer les avis clients (GET)
 * Mode public : retourne uniquement les avis validés ('is_validated = 1')
 * Mode modération ('all = 1') : pour employés/admins, retourne tous les avis.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse("error", "Méthode non autorisée.", [], 405);
}

$all = isset($_GET['all']) && $_GET['all'] == 1;
$db = Database::getInstance()->getConnection();

try {
    if ($all) {
        // Mode modération : accès réservé aux employés / admins
        requireRoles(['employe', 'admin']);
        
        $stmt = $db->prepare("
            SELECT r.*, u.first_name, u.last_name, o.id as order_id, m.title as menu_title
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN orders o ON r.order_id = o.id
            JOIN menus m ON o.menu_id = m.id
            ORDER BY r.created_at DESC
        ");
        $stmt->execute();
    } else {
        // Mode public : tout le monde peut voir les avis validés
        $stmt = $db->prepare("
            SELECT r.rating, r.comment, r.created_at, u.first_name, SUBSTRING(u.last_name, 1, 1) as last_name_initial, m.title as menu_title
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN orders o ON r.order_id = o.id
            JOIN menus m ON o.menu_id = m.id
            WHERE r.is_validated = 1
            ORDER BY r.created_at DESC
            LIMIT 10
        ");
        $stmt->execute();
    }
    
    $reviews = $stmt->fetchAll();
    sendResponse("success", "Avis récupérés.", ["reviews" => $reviews]);

} catch (PDOException $e) {
    sendResponse("error", "Une erreur technique est survenue.", ["debug" => $e->getMessage()], 500);
}
