<?php
/**
 * Fonctions d'aide (Helpers) pour le backend de Vite & Gourmand
 */

// Démarrer la session de manière sécurisée
if (session_status() == PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_secure'   => isset($_SERVER['HTTPS']), // Cookie sécurisé si HTTPS
        'use_only_cookies'=> true,
        'cookie_samesite' => 'Strict'
    ]);
}

/**
 * Envoie une réponse JSON standardisée
 */
function sendResponse($status, $message, $data = [], $code = 200) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($code);
    echo json_encode(array_merge([
        "status" => $status,
        "message" => $message
    ], $data), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

/**
 * Vérifie si l'utilisateur est connecté
 */
function requireLogin() {
    if (!isset($_SESSION['user_id'])) {
        sendResponse("error", "Authentification requise. Veuillez vous connecter.", [], 401);
    }
}

/**
 * Vérifie si l'utilisateur possède un rôle spécifique
 * @param array|string $allowedRoles Rôles autorisés (e.g. 'admin', ['admin', 'employe'])
 */
function requireRoles($allowedRoles) {
    requireLogin();
    $userRole = $_SESSION['user_role'] ?? '';
    
    if (is_array($allowedRoles)) {
        if (!in_array($userRole, $allowedRoles)) {
            sendResponse("error", "Accès interdit : privilèges insuffisants.", [], 403);
        }
    } else {
        if ($userRole !== $allowedRoles) {
            sendResponse("error", "Accès interdit : privilèges insuffisants.", [], 403);
        }
    }
}

/**
 * Simule l'envoi d'un e-mail en écrivant le contenu dans un fichier log
 * afin que l'étudiant et le correcteur puissent inspecter les e-mails envoyés en local.
 */
function sendMockEmail($to, $subject, $body) {
    $mailLogFile = dirname(__DIR__) . '/data/email_logs.txt';
    $dir = dirname($mailLogFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $logContent = "============================================================\n";
    $logContent .= "DATE : $timestamp\n";
    $logContent .= "DESTINATAIRE : $to\n";
    $logContent .= "SUJET : $subject\n";
    $logContent .= "------------------------------------------------------------\n";
    $logContent .= "$body\n";
    $logContent .= "============================================================\n\n";
    
    file_put_contents($mailLogFile, $logContent, FILE_APPEND);
    
    // Essayer d'utiliser la fonction mail de PHP en bonus si configurée
    @mail($to, $subject, $body, "From: no-reply@vitegourmand.fr\r\nContent-Type: text/plain; charset=utf-8");
    return true;
}
