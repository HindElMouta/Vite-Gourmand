<?php
/**
 * API d'administration pour la gestion des employés (POST/GET JSON)
 * Rôle requis : 'admin'
 * Supporte :
 * 1. Créer un compte employé ('action' => 'create')
 * 2. Désactiver/Activer un compte employé ('action' => 'toggle_status')
 * 3. Lister les employés ('action' => 'list' ou méthode GET)
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

// Réservé à l'administrateur
requireRoles('admin');

$db = Database::getInstance()->getConnection();

// Mode GET : Lister les employés
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $db->prepare("
            SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active, u.created_at 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.name = 'employe'
            ORDER BY u.created_at DESC
        ");
        $stmt->execute();
        $employees = $stmt->fetchAll();
        sendResponse("success", "Liste des employés récupérée.", ["employees" => $employees]);
    } catch (PDOException $e) {
        sendResponse("error", "Erreur technique.", ["debug" => $e->getMessage()], 500);
    }
}

// Mode POST : Créer ou modifier l'état
$inputData = json_decode(file_get_contents('php://input'), true);

if (!$inputData) {
    sendResponse("error", "Données invalides.", [], 400);
}

$action = trim($inputData['action'] ?? '');

if ($action === 'create') {
    $firstName = trim($inputData['first_name'] ?? '');
    $lastName = trim($inputData['last_name'] ?? '');
    $email = trim($inputData['email'] ?? '');
    $password = $inputData['password'] ?? '';
    $phone = trim($inputData['phone'] ?? '');

    if (empty($firstName) || empty($lastName) || empty($email) || empty($password)) {
        sendResponse("error", "Veuillez renseigner le prénom, nom, email et mot de passe de l'employé.", [], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse("error", "Format d'adresse e-mail invalide.", [], 400);
    }

    try {
        // Vérifier si l'adresse e-mail existe déjà
        $stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
        $stmt->execute(['email' => $email]);
        if ($stmt->fetch()) {
            sendResponse("error", "Cette adresse e-mail est déjà utilisée.", [], 409);
        }

        // Récupérer l'ID du rôle 'employe'
        $stmt = $db->prepare("SELECT id FROM roles WHERE name = 'employe'");
        $stmt->execute();
        $role = $stmt->fetch();
        $roleId = $role ? $role['id'] : 2;

        // Hacher le mot de passe
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        // Insérer le nouvel employé
        $stmt = $db->prepare("
            INSERT INTO users (first_name, last_name, email, phone, password_hash, role_id, is_active) 
            VALUES (:first_name, :last_name, :email, :phone, :password_hash, :role_id, 1)
        ");
        $stmt->execute([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'phone' => $phone,
            'password_hash' => $passwordHash,
            'role_id' => $roleId
        ]);

        // Envoyer l'e-mail de notification à l'employé (SANS communiquer le mot de passe pour des raisons de sécurité)
        $subject = "Création de votre compte employé - Vite & Gourmand";
        $body = "Bonjour $firstName,\n\n";
        $body .= "Un compte de type 'employé' a été créé pour vous sur l'application Vite & Gourmand.\n\n";
        $body .= "Votre identifiant (email) est : $email\n";
        $body .= "Pour des raisons de sécurité, votre mot de passe ne vous est pas communiqué par e-mail.\n";
        $body .= "Veuillez vous rapprocher de l'administrateur (José) pour l'obtenir lors de votre prise de poste.\n\n";
        $body .= "L'équipe Vite & Gourmand.";

        sendMockEmail($email, $subject, $body);

        sendResponse("success", "Compte employé créé avec succès. L'employé a été notifié par mail.");

    } catch (PDOException $e) {
        sendResponse("error", "Erreur technique de création.", ["debug" => $e->getMessage()], 500);
    }

} elseif ($action === 'toggle_status') {
    $employeeId = isset($inputData['employee_id']) ? intval($inputData['employee_id']) : 0;
    
    if ($employeeId <= 0) {
        sendResponse("error", "ID d'employé invalide.", [], 400);
    }

    try {
        // Récupérer l'employé et s'assurer que c'est bien un employé (pas un admin)
        $stmt = $db->prepare("
            SELECT u.is_active, r.name as role_name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = :id
        ");
        $stmt->execute(['id' => $employeeId]);
        $employee = $stmt->fetch();

        if (!$employee) {
            sendResponse("error", "Employé non trouvé.", [], 404);
        }

        if ($employee['role_name'] === 'admin') {
            sendResponse("error", "Impossible de modifier le statut du compte administrateur principal.", [], 400);
        }

        $newActiveStatus = $employee['is_active'] == 1 ? 0 : 1;

        // Mettre à jour l'état
        $stmtUpdate = $db->prepare("UPDATE users SET is_active = :is_active WHERE id = :id");
        $stmtUpdate->execute(['is_active' => $newActiveStatus, 'id' => $employeeId]);

        $statusLabel = $newActiveStatus == 1 ? "activé" : "désactivé et rendu inutilisable";
        sendResponse("success", "Le compte employé a bien été $statusLabel.");

    } catch (PDOException $e) {
        sendResponse("error", "Erreur technique de mise à jour.", ["debug" => $e->getMessage()], 500);
    }
} else {
    sendResponse("error", "Action non reconnue.", [], 400);
}
