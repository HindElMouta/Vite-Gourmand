<?php
/**
 * API pour récupérer le détail d'un menu spécifique (GET avec paramètre id)
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse("error", "Méthode non autorisée.", [], 405);
}

$menuId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($menuId <= 0) {
    sendResponse("error", "ID de menu invalide.", [], 400);
}

$db = Database::getInstance()->getConnection();

try {
    // 1. Récupérer le menu
    $stmt = $db->prepare("SELECT * FROM menus WHERE id = :id");
    $stmt->execute(['id' => $menuId]);
    $menu = $stmt->fetch();

    if (!$menu) {
        sendResponse("error", "Menu non trouvé.", [], 404);
    }

    // 2. Récupérer les plats associés
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

        // 3. Récupérer les allergènes
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

    // 4. Calculer la moyenne des avis
    $stmtRating = $db->prepare("
        SELECT AVG(r.rating) as avg_rating 
        FROM reviews r
        JOIN orders o ON r.order_id = o.id
        WHERE o.menu_id = :menu_id AND r.is_validated = 1
    ");
    $stmtRating->execute(['menu_id' => $menuId]);
    $avgRating = $stmtRating->fetchColumn();
    $rating = $avgRating ? round(floatval($avgRating), 1) : 5.0;

    $menuDetail = [
        'id' => $menu['id'],
        'name' => $menu['title'],
        'description' => $menu['description'],
        'tag' => ucfirst($menu['theme']),
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

    sendResponse("success", "Détail du menu récupéré.", ["menu" => $menuDetail]);

} catch (PDOException $e) {
    sendResponse("error", "Erreur technique de récupération du menu.", ["debug" => $e->getMessage()], 500);
}
