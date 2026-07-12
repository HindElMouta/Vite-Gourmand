<?php
/**
 * API de Réinitialisation de Mot de Passe (POST JSON)
 * Supporte :
 * 1. Demande de réinitialisation ('action' => 'request') : envoie un e-mail avec un lien simulé.
 * 2. Soumission du nouveau mot de passe ('action' => 'reset') : met à jour le mot de passe dans la base de données.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';

$inputData = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$inputData) {
    sendResponse("error", "Méthode non autorisée ou données invalides.", [], 400);
}

$action = $inputData['action'] ?? '';
$email = trim($inputData['email'] ?? '');

if (empty($email)) {
    sendResponse("error", "L'adresse e-mail est obligatoire.", [], 400);
}

$db = Database::getInstance()->getConnection();

if ($action === 'request') {
    try {
        // Vérifier si l'utilisateur existe
        $stmt = $db->prepare("SELECT first_name, last_name FROM users WHERE email = :email AND is_active = 1");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        if ($user) {
            // Générer un token de réinitialisation simulé
            $token = bin2hex(random_bytes(16));
            
            // Stocker le token en session pour la simulation
            $_SESSION['reset_tokens'][$email] = [
                'token' => $token,
                'expires' => time() + 3600 // Expire dans 1 heure
            ];

            // Construire l'URL de réinitialisation (en local sur la page index.html)
            $resetLink = "http://localhost/vite-gourmand/index.html?view=reset-password&email=" . urlencode($email) . "&token=" . $token;

            // Envoyer l'e-mail simulé
            $subject = "Réinitialisation de votre mot de passe - Vite & Gourmand";
            $body = "Bonjour " . $user['first_name'] . ",\n\n";
            $body .= "Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Vite & Gourmand.\n\n";
            $body .= "Veuillez cliquer sur le lien ci-dessous pour choisir un nouveau mot de passe (ce lien est valable 1 heure) :\n";
            $body .= "$resetLink\n\n";
            $body .= "Si vous n'avez pas demandé ce changement, vous pouvez ignorer cet e-mail en toute sécurité.\n\n";
            $body .= "L'équipe Vite & Gourmand.\n";

            sendMockEmail($email, $subject, $body);
        }

        // Toujours renvoyer le même message de succès pour des raisons de sécurité (prévention de l'énumération des e-mails)
        sendResponse("success", "Si l'adresse email existe, un lien de réinitialisation vous a été envoyé.");

    } catch (Exception $e) {
        sendResponse("error", "Une erreur est survenue lors de la demande.", ["debug" => $e->getMessage()], 500);
    }

} elseif ($action === 'reset') {
    $password = $inputData['password'] ?? '';
    $token = $inputData['token'] ?? '';

    if (empty($password) || empty($token)) {
        sendResponse("error", "Le mot de passe et le jeton de sécurité sont obligatoires.", [], 400);
    }

    // 1. Validation de la complexité du mot de passe
    $pattern = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{10,}$/';
    if (!preg_match($pattern, $password)) {
        sendResponse("error", "Le mot de passe doit comporter au moins 10 caractères et contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial.", [], 400);
    }

    // 2. Valider le token (simulation)
    $stored = $_SESSION['reset_tokens'][$email] ?? null;
    
    if (!$stored || $stored['token'] !== $token || time() > $stored['expires']) {
        sendResponse("error", "Le lien de réinitialisation est invalide ou a expiré.", [], 400);
    }

    try {
        // Hacher le nouveau mot de passe
        $newPasswordHash = password_hash($password, PASSWORD_DEFAULT);

        // Mettre à jour dans la base de données
        $stmt = $db->prepare("UPDATE users SET password_hash = :hash WHERE email = :email");
        $stmt->execute(['hash' => $newPasswordHash, 'email' => $email]);

        // Supprimer le token utilisé
        unset($_SESSION['reset_tokens'][$email]);

        sendResponse("success", "Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.");

    } catch (PDOException $e) {
        sendResponse("error", "Une erreur technique est survenue.", ["debug" => $e->getMessage()], 500);
    }

} else {
    sendResponse("error", "Action non reconnue.", [], 400);
}
