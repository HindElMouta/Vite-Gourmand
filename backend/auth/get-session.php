<?php
/**
 * API pour récupérer les informations de la session active (GET)
 */

require_once __DIR__ . '/../utils/helpers.php';

if (isset($_SESSION['user_id'])) {
    sendResponse("success", "Session active.", [
        "user" => [
            "id" => $_SESSION['user_id'],
            "first_name" => $_SESSION['user_first_name'],
            "last_name" => $_SESSION['user_last_name'],
            "email" => $_SESSION['user_email'],
            "phone" => $_SESSION['user_phone'],
            "postal_address" => $_SESSION['user_postal_address'],
            "role" => $_SESSION['user_role']
        ]
    ]);
} else {
    sendResponse("error", "Aucune session active.", ["user" => null], 401);
}
