<?php
/**
 * API d'administration pour la récupération des rapports analytiques et statistiques (GET)
 * Lit les données de la base de données non relationnelle MongoDB (ou simulation de repli JSON)
 * Filtres disponibles :
 * - date_debut (format Y-m-d)
 * - date_fin (format Y-m-d)
 * - menu_id (optionnel)
 * Rôle requis : 'admin'
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/mongodb.php';
require_once __DIR__ . '/../utils/helpers.php';

// Réservé à l'administrateur
requireRoles('admin');

$dateDebut = isset($_GET['date_debut']) ? $_GET['date_debut'] : null;
$dateFin = isset($_GET['date_fin']) ? $_GET['date_fin'] : null;
$menuIdFilter = isset($_GET['menu_id']) && !empty($_GET['menu_id']) ? intval($_GET['menu_id']) : null;

try {
    $nosql = MongoDBConn::getInstance();
    
    // Récupérer l'intégralité des documents de la collection analytique
    $allDocs = $nosql->findAll('order_analytics');
    
    // Filtrer les données en PHP pour plus de souplesse (compatibilité NoSQL Fallback)
    $filteredDocs = [];
    foreach ($allDocs as $doc) {
        // Filtre par date de début
        if ($dateDebut && date('Y-m-d', strtotime($doc['order_date'])) < $dateDebut) {
            continue;
        }
        // Filtre par date de fin
        if ($dateFin && date('Y-m-d', strtotime($doc['order_date'])) > $dateFin) {
            continue;
        }
        // Filtre par menu
        if ($menuIdFilter && $doc['menu_id'] !== $menuIdFilter) {
            continue;
        }
        
        $filteredDocs[] = $doc;
    }

    // Agrégation des statistiques par menu
    $aggregation = [];
    $totalRevenue = 0.0;
    $totalOrders = 0;

    foreach ($filteredDocs as $doc) {
        $menuId = $doc['menu_id'];
        $menuTitle = $doc['menu_title'] ?? "Menu inconnu";
        $revenue = floatval($doc['revenue']);
        
        if (!isset($aggregation[$menuId])) {
            $aggregation[$menuId] = [
                'menu_id' => $menuId,
                'menu_title' => $menuTitle,
                'order_count' => 0,
                'revenue' => 0.0
            ];
        }
        
        $aggregation[$menuId]['order_count'] += 1;
        $aggregation[$menuId]['revenue'] += $revenue;
        
        $totalRevenue += $revenue;
        $totalOrders += 1;
    }

    // Convertir l'agrégation en liste indexée pour le frontend
    $detailedStats = array_values($aggregation);
    
    // Préparer les données pour les graphiques (Chart.js ou similaire)
    $chartLabels = [];
    $chartOrderCounts = [];
    $chartRevenues = [];

    foreach ($detailedStats as $stat) {
        $chartLabels[] = $stat['menu_title'];
        $chartOrderCounts[] = $stat['order_count'];
        $chartRevenues[] = $stat['revenue'];
    }

    sendResponse("success", "Statistiques consolidées (NoSQL).", [
        "is_fallback_mode" => $nosql->isFallbackMode(),
        "total_revenue" => $totalRevenue,
        "total_orders" => $totalOrders,
        "chart_data" => [
            "labels" => $chartLabels,
            "order_counts" => $chartOrderCounts,
            "revenues" => $chartRevenues
        ],
        "detailed_stats" => $detailedStats
    ]);

} catch (Exception $e) {
    sendResponse("error", "Erreur lors du calcul des statistiques analytiques.", ["debug" => $e->getMessage()], 500);
}
