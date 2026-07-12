<?php
/**
 * API de Connexion Utilisateur/Employé/Admin (POST JSON)
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

// Lire les données JSON reçues
$inputData = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$inputData) {
    sendResponse("error", "Méthode non autorisée ou données invalides.", [], 400);
}

$email = trim($inputData['email'] ?? '');
$password = $inputData['password'] ?? '';

if (empty($email) || empty($password)) {
    sendResponse("error", "Veuillez saisir votre email et votre mot de passe.", [], 400);
}

$db = Database::getInstance()->getConnection();

try {
    // Récupérer l'utilisateur avec son rôle
    $stmt = $db->prepare("SELECT u.*, r.name as role_name 
                          FROM users u 
                          JOIN roles r ON u.role_id = r.id 
                          WHERE u.email = :email AND u.is_active = 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    // Vérifier l'existence et la validité du mot de passe
    if (!$user || !password_verify($password, $user['password_hash'])) {
        sendResponse("error", "Identifiants incorrects ou compte inactif.", [], 401);
    }

    // Initialiser les variables de session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_role'] = $user['role_name'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_first_name'] = $user['first_name'];
    $_SESSION['user_last_name'] = $user['last_name'];
    $_SESSION['user_phone'] = $user['phone'];
    $_SESSION['user_postal_address'] = $user['postal_address'];

    // Retourner les données utilisateur connectées (sans données sensibles)
    sendResponse("success", "Connexion réussie.", [
        "user" => [
            "id" => $user['id'],
            "first_name" => $user['first_name'],
            "last_name" => $user['last_name'],
            "email" => $user['email'],
            "phone" => $user['phone'],
            "postal_address" => $user['postal_address'],
            "role" => $user['role_name']
        ]
    ]);

} catch (PDOException $e) {
    sendResponse("error", "Une erreur technique est survenue.", ["debug" => $e->getMessage()], 500);
}
