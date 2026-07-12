<?php
/**
 * API pour gérer le catalogue et les horaires (menus, plats, horaires) (POST JSON)
 * Rôles requis : 'employe' / 'admin'
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

requireRoles(['employe', 'admin']);

$inputData = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$inputData) {
    sendResponse("error", "Méthode non autorisée.", [], 400);
}

$action = trim($inputData['action'] ?? '');
$db = Database::getInstance()->getConnection();

try {
    switch ($action) {
        
        // ---------------- MENU CRUD ----------------
        case 'create_menu':
            $title = trim($inputData['title'] ?? '');
            $desc = trim($inputData['description'] ?? '');
            $theme = trim($inputData['theme'] ?? 'classique');
            $regime = trim($inputData['regime'] ?? 'classique');
            $minPeople = intval($inputData['min_people'] ?? 1);
            $basePrice = floatval($inputData['base_price'] ?? 0.00);
            $prepTime = trim($inputData['prep_time'] ?? '24h');
            $stock = intval($inputData['stock'] ?? 0);
            $imageUrl = trim($inputData['image_url'] ?? '');
            $storage = trim($inputData['storage_conditions'] ?? '');

            if (empty($title) || empty($desc) || $basePrice <= 0 || $minPeople <= 0) {
                sendResponse("error", "Veuillez remplir les informations obligatoires (titre, description, prix, min convives).", [], 400);
            }

            $stmt = $db->prepare("
                INSERT INTO menus (title, description, theme, regime, min_people, base_price, prep_time, stock, image_url, storage_conditions) 
                VALUES (:title, :description, :theme, :regime, :min_people, :base_price, :prep_time, :stock, :image_url, :storage_conditions)
            ");
            $stmt->execute([
                'title' => $title,
                'description' => $desc,
                'theme' => $theme,
                'regime' => $regime,
                'min_people' => $minPeople,
                'base_price' => $basePrice,
                'prep_time' => $prepTime,
                'stock' => $stock,
                'image_url' => $imageUrl,
                'storage_conditions' => $storage
            ]);

            sendResponse("success", "Menu créé avec succès !", ["menu_id" => $db->lastInsertId()]);
            break;

        case 'update_menu':
            $id = intval($inputData['id'] ?? 0);
            $title = trim($inputData['title'] ?? '');
            $desc = trim($inputData['description'] ?? '');
            $theme = trim($inputData['theme'] ?? '');
            $regime = trim($inputData['regime'] ?? '');
            $minPeople = intval($inputData['min_people'] ?? 0);
            $basePrice = floatval($inputData['base_price'] ?? 0.00);
            $prepTime = trim($inputData['prep_time'] ?? '');
            $stock = intval($inputData['stock'] ?? 0);
            $imageUrl = trim($inputData['image_url'] ?? '');
            $storage = trim($inputData['storage_conditions'] ?? '');

            if ($id <= 0 || empty($title) || empty($desc) || $basePrice <= 0 || $minPeople <= 0) {
                sendResponse("error", "Informations de modification incomplètes.", [], 400);
            }

            $stmt = $db->prepare("
                UPDATE menus SET 
                    title = :title, description = :description, theme = :theme, regime = :regime, 
                    min_people = :min_people, base_price = :base_price, prep_time = :prep_time, 
                    stock = :stock, image_url = :image_url, storage_conditions = :storage_conditions 
                WHERE id = :id
            ");
            $stmt->execute([
                'title' => $title,
                'description' => $desc,
                'theme' => $theme,
                'regime' => $regime,
                'min_people' => $minPeople,
                'base_price' => $basePrice,
                'prep_time' => $prepTime,
                'stock' => $stock,
                'image_url' => $imageUrl,
                'storage_conditions' => $storage,
                'id' => $id
            ]);

            sendResponse("success", "Menu mis à jour avec succès.");
            break;

        case 'delete_menu':
            $id = intval($inputData['id'] ?? 0);
            if ($id <= 0) {
                sendResponse("error", "ID de menu invalide.", [], 400);
            }

            // Supprimer le menu (les liaisons menu_dishes seront supprimées en cascade)
            $stmt = $db->prepare("DELETE FROM menus WHERE id = :id");
            $stmt->execute(['id' => $id]);

            sendResponse("success", "Menu supprimé avec succès.");
            break;

        // ---------------- HORAIRES CRUD ----------------
        case 'update_schedules':
            $schedulesList = $inputData['schedules'] ?? []; // Tableau d'horaires [{day_of_week, open_time, close_time, is_closed}]

            if (empty($schedulesList)) {
                sendResponse("error", "Aucun horaire fourni.", [], 400);
            }

            $db->beginTransaction();

            $stmt = $db->prepare("
                INSERT INTO schedules (day_of_week, open_time, close_time, is_closed) 
                VALUES (:day, :open, :close, :closed)
                ON DUPLICATE KEY UPDATE open_time = VALUES(open_time), close_time = VALUES(close_time), is_closed = VALUES(is_closed)
            ");

            foreach ($schedulesList as $sch) {
                $stmt->execute([
                    'day' => trim($sch['day_of_week']),
                    'open' => !empty($sch['open_time']) ? trim($sch['open_time']) : null,
                    'close' => !empty($sch['close_time']) ? trim($sch['close_time']) : null,
                    'closed' => isset($sch['is_closed']) ? intval($sch['is_closed']) : 0
                ]);
            }

            $db->commit();
            sendResponse("success", "Horaires mis à jour avec succès.");
            break;

        // ---------------- DESSERT/PLAT/ENTRÉE CRUD ----------------
        case 'create_dish':
            $name = trim($inputData['name'] ?? '');
            $desc = trim($inputData['description'] ?? '');
            $courseType = trim($inputData['course_type'] ?? ''); // 'entree', 'plat', 'dessert'
            $imageUrl = trim($inputData['image_url'] ?? '');
            $menuIds = $inputData['menu_ids'] ?? []; // Menus dans lesquels ce plat apparaît
            $allergenIds = $inputData['allergen_ids'] ?? []; // Allergènes du plat

            if (empty($name) || empty($desc) || !in_array($courseType, ['entree', 'plat', 'dessert'])) {
                sendResponse("error", "Informations de plat invalides.", [], 400);
            }

            $db->beginTransaction();

            $stmt = $db->prepare("
                INSERT INTO dishes (name, description, course_type, image_url) 
                VALUES (:name, :description, :course_type, :image_url)
            ");
            $stmt->execute([
                'name' => $name,
                'description' => $desc,
                'course_type' => $courseType,
                'image_url' => $imageUrl
            ]);
            $dishId = $db->lastInsertId();

            // Associer aux menus
            if (!empty($menuIds)) {
                $stmtMenuBind = $db->prepare("INSERT INTO menu_dishes (menu_id, dish_id) VALUES (:menu_id, :dish_id)");
                foreach ($menuIds as $mId) {
                    $stmtMenuBind->execute(['menu_id' => intval($mId), 'dish_id' => $dishId]);
                }
            }

            // Associer aux allergènes
            if (!empty($allergenIds)) {
                $stmtAllergenBind = $db->prepare("INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (:dish_id, :allergen_id)");
                foreach ($allergenIds as $aId) {
                    $stmtAllergenBind->execute(['dish_id' => $dishId, 'allergen_id' => intval($aId)]);
                }
            }

            $db->commit();
            sendResponse("success", "Plat créé avec succès !", ["dish_id" => $dishId]);
            break;

        case 'delete_dish':
            $id = intval($inputData['id'] ?? 0);
            if ($id <= 0) {
                sendResponse("error", "ID de plat invalide.", [], 400);
            }

            $stmt = $db->prepare("DELETE FROM dishes WHERE id = :id");
            $stmt->execute(['id' => $id]);

            sendResponse("success", "Plat supprimé avec succès.");
            break;

        default:
            sendResponse("error", "Action non supportée.", [], 400);
            break;
    }
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    sendResponse("error", "Erreur technique de gestion du catalogue.", ["debug" => $e->getMessage()], 500);
}
