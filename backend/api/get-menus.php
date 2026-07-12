<?php
/**
 * API pour récupérer tous les menus avec leurs plats et allergènes (GET)
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse("error", "Méthode non autorisée.", [], 405);
}

$db = Database::getInstance()->getConnection();

try {
    // 1. Récupérer tous les menus
    $stmt = $db->prepare("SELECT * FROM menus ORDER BY base_price ASC");
    $stmt->execute();
    $dbMenus = $stmt->fetchAll();

    $menusList = [];

    foreach ($dbMenus as $menu) {
        $menuId = $menu['id'];

        // 2. Récupérer les plats associés à ce menu
        $stmtDishes = $db->prepare("
            SELECT d.* 
            FROM dishes d
            JOIN menu_dishes md ON d.id = md.dish_id
            WHERE md.menu_id = :menu_id
        ");
        $stmtDishes->execute(['menu_id' => $menuId]);
        $dbDishes = $stmtDishes->fetchAll();

        $entrées = [];
        $plats = [];
        $desserts = [];

        foreach ($dbDishes as $dish) {
            $dishId = $dish['id'];

            // 3. Récupérer les allergènes de chaque plat
            $stmtAllergens = $db->prepare("
                SELECT a.name 
                FROM allergens a
                JOIN dish_allergens da ON a.id = da.allergen_id
                WHERE da.dish_id = :dish_id
            ");
            $stmtAllergens->execute(['dish_id' => $dishId]);
            $allergens = $stmtAllergens->fetchAll(PDO::FETCH_COLUMN);

            $dishData = [
                'id' => $dish['id'],
                'name' => $dish['name'],
                'desc' => $dish['description'],
                'image' => $dish['image_url'],
                'allergens' => $allergens
            ];

            if ($dish['course_type'] === 'entree') {
                $entrées[] = $dishData;
            } elseif ($dish['course_type'] === 'plat') {
                $plats[] = $dishData;
            } elseif ($dish['course_type'] === 'dessert') {
                $desserts[] = $dishData;
            }
        }

        // 4. Calculer la note moyenne des avis validés pour ce menu
        $stmtRating = $db->prepare("
            SELECT AVG(r.rating) as avg_rating 
            FROM reviews r
            JOIN orders o ON r.order_id = o.id
            WHERE o.menu_id = :menu_id AND r.is_validated = 1
        ");
        $stmtRating->execute(['menu_id' => $menuId]);
        $avgRating = $stmtRating->fetchColumn();
        $rating = $avgRating ? round(floatval($avgRating), 1) : 5.0; // Par défaut 5.0 si pas d'avis

        $menusList[] = [
            'id' => $menu['id'],
            'name' => $menu['title'],
            'description' => $menu['description'],
            'tag' => ucfirst($menu['theme']), // e.g. Noel, classique
            'theme' => $menu['theme'],
            'regime' => $menu['regime'],
            'pricePerPerson' => floatval($menu['base_price']),
            'minPax' => intval($menu['min_people']),
            'prepTime' => $menu['prep_time'],
            'imageLocal' => $menu['image_url'],
            'imageOnline' => $menu['image_url'],
            'storage_conditions' => $menu['storage_conditions'],
            'composition' => [
                'entrées' => $entrées,
                'plats' => $plats,
                'desserts' => $desserts
            ],
            'stock' => intval($menu['stock']),
            'rating' => $rating
        ];
    }

    sendResponse("success", "Menus récupérés.", ["menus" => $menusList]);

} catch (PDOException $e) {
    sendResponse("error", "Erreur technique de récupération des menus.", ["debug" => $e->getMessage()], 500);
}
