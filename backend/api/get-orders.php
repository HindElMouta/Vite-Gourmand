<?php
/**
 * API de récupération des commandes (GET)
 * Rôle 'utilisateur' : uniquement ses propres commandes.
 * Rôles 'employe' / 'admin' : toutes les commandes avec filtres par statut et recherche client.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

// Authentification requise
requireLogin();

$userId = $_SESSION['user_id'];
$userRole = $_SESSION['user_role'];

$db = Database::getInstance()->getConnection();

try {
    $query = "
        SELECT o.*, m.title as menu_title, m.theme as menu_theme, m.regime as menu_regime
        FROM orders o
        JOIN menus m ON o.menu_id = m.id
    ";
    $params = [];

    if ($userRole === 'utilisateur') {
        // Uniquement les commandes de l'utilisateur connecté
        $query .= " WHERE o.user_id = :user_id";
        $params['user_id'] = $userId;
    } else {
        // Employé ou Admin : toutes les commandes avec filtres optionnels
        $conditions = [];
        
        // Filtre par statut de commande
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $conditions[] = "o.status = :status";
            $params['status'] = $_GET['status'];
        }
        
        // Filtre par recherche textuelle (client ou menu)
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $search = "%" . trim($_GET['search']) . "%";
            $conditions[] = "(o.client_last_name LIKE :search 
                            OR o.client_first_name LIKE :search 
                            OR o.client_email LIKE :search 
                            OR o.id LIKE :search 
                            OR m.title LIKE :search)";
            $params['search'] = $search;
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }
    }

    $query .= " ORDER BY o.created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    $ordersList = [];

    foreach ($orders as $order) {
        $orderId = $order['id'];

        // Récupérer l'historique de statut pour cette commande
        $stmtHistory = $db->prepare("
            SELECT status, status_changed_at 
            FROM order_status_history 
            WHERE order_id = :order_id 
            ORDER BY status_changed_at ASC
        ");
        $stmtHistory->execute(['order_id' => $orderId]);
        $history = $stmtHistory->fetchAll();

        // Récupérer l'avis associé s'il existe
        $stmtReview = $db->prepare("SELECT id, rating, comment, is_validated FROM reviews WHERE order_id = :order_id");
        $stmtReview->execute(['order_id' => $orderId]);
        $review = $stmtReview->fetch();

        $ordersList[] = [
            'id' => $order['id'],
            'client_last_name' => $order['client_last_name'],
            'client_first_name' => $order['client_first_name'],
            'client_email' => $order['client_email'],
            'client_phone' => $order['client_phone'],
            'delivery_address' => $order['delivery_address'],
            'delivery_date' => $order['delivery_date'],
            'delivery_time' => $order['delivery_time'],
            'menu_id' => $order['menu_id'],
            'menu_title' => $order['menu_title'],
            'menu_theme' => $order['menu_theme'],
            'menu_regime' => $order['menu_regime'],
            'guest_count' => intval($order['guest_count']),
            'menu_unit_price' => floatval($order['menu_unit_price']),
            'delivery_price' => floatval($order['delivery_price']),
            'discount_amount' => floatval($order['discount_amount']),
            'total_price' => floatval($order['total_price']),
            'status' => $order['status'],
            'cancellation_reason' => $order['cancellation_reason'],
            'cancellation_contact_method' => $order['cancellation_contact_method'],
            'created_at' => $order['created_at'],
            'updated_at' => $order['updated_at'],
            'status_history' => $history,
            'review' => $review ? [
                'id' => $review['id'],
                'rating' => intval($review['rating']),
                'comment' => $review['comment'],
                'is_validated' => (bool)$review['is_validated']
            ] : null
        ];
    }

    sendResponse("success", "Commandes récupérées.", ["orders" => $ordersList]);

} catch (PDOException $e) {
    sendResponse("error", "Erreur technique de récupération des commandes.", ["debug" => $e->getMessage()], 500);
}
