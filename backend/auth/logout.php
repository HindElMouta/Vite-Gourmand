<?php
/**
 * API de Déconnexion (POST ou GET)
 */

require_once __DIR__ . '/../utils/helpers.php';

// Détruire toutes les variables de session
$_SESSION = array();

// Supprimer le cookie de session si nécessaire
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Détruire la session
session_destroy();

sendResponse("success", "Déconnexion réussie.");
