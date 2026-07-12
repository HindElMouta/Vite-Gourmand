<?php
/**
 * API d'Inscription Utilisateur (POST JSON)
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

// Lire les données JSON reçues
$inputData = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$inputData) {
    sendResponse("error", "Méthode non autorisée ou données invalides.", [], 400);
}

$firstName = trim($inputData['first_name'] ?? '');
$lastName = trim($inputData['last_name'] ?? '');
$email = trim($inputData['email'] ?? '');
$phone = trim($inputData['phone'] ?? '');
$postalAddress = trim($inputData['postal_address'] ?? '');
$password = $inputData['password'] ?? '';

// 1. Validation des champs obligatoires
if (empty($firstName) || empty($lastName) || empty($email) || empty($password)) {
    sendResponse("error", "Veuillez remplir tous les champs obligatoires (prénom, nom, email, mot de passe).", [], 400);
}

// 2. Validation du format de l'adresse email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse("error", "Format d'adresse e-mail invalide.", [], 400);
}

// 3. Validation de la complexité du mot de passe
// (10 caractères minimum, 1 caractère spécial, 1 majuscule, 1 minuscule, 1 chiffre)
$pattern = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{10,}$/';
if (!preg_match($pattern, $password)) {
    sendResponse("error", "Le mot de passe doit comporter au moins 10 caractères et contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial.", [], 400);
}

$db = Database::getInstance()->getConnection();

try {
    // 4. Vérifier si l'adresse e-mail existe déjà
    $stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->execute(['email' => $email]);
    if ($stmt->fetch()) {
        sendResponse("error", "Cette adresse e-mail est déjà enregistrée.", [], 409);
    }

    // 5. Récupérer l'ID du rôle 'utilisateur'
    $stmt = $db->prepare("SELECT id FROM roles WHERE name = 'utilisateur'");
    $stmt->execute();
    $role = $stmt->fetch();
    $roleId = $role ? $role['id'] : 3;

    // 6. Hacher le mot de passe de manière sécurisée (Bcrypt par défaut)
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // 7. Insérer le nouvel utilisateur
    $stmt = $db->prepare("INSERT INTO users (first_name, last_name, email, phone, postal_address, password_hash, role_id) 
                          VALUES (:first_name, :last_name, :email, :phone, :postal_address, :password_hash, :role_id)");
    $stmt->execute([
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'phone' => $phone,
        'postal_address' => $postalAddress,
        'password_hash' => $passwordHash,
        'role_id' => $roleId
    ]);

    // 8. Envoyer automatiquement l'e-mail de bienvenue
    $welcomeSubject = "Bienvenue chez Vite & Gourmand, $firstName !";
    $welcomeBody = "Bonjour $firstName $lastName,\n\n";
    $welcomeBody .= "Nous sommes ravis de vous compter parmi nos clients chez Vite & Gourmand, votre traiteur de référence à Bordeaux !\n\n";
    $welcomeBody .= "Grâce à votre compte, vous pouvez maintenant commander nos menus en quelques clics et suivre vos livraisons.\n\n";
    $welcomeBody .= "À très bientôt pour régaler vos convives,\n";
    $welcomeBody .= "L'équipe Vite & Gourmand.\n";
    
    sendMockEmail($email, $welcomeSubject, $welcomeBody);

    sendResponse("success", "Inscription réussie ! Un e-mail de bienvenue vous a été envoyé.");

} catch (PDOException $e) {
    sendResponse("error", "Une erreur technique est survenue.", ["debug" => $e->getMessage()], 500);
}
