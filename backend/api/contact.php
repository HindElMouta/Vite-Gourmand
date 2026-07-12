<?php
/**
 * API pour le formulaire de contact (POST JSON)
 * Envoie un email fictif de notification à l'entreprise
 */

require_once __DIR__ . '/../utils/helpers.php';

$inputData = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$inputData) {
    sendResponse("error", "Méthode non autorisée.", [], 400);
}

$title = trim($inputData['title'] ?? '');
$description = trim($inputData['description'] ?? '');
$email = trim($inputData['email'] ?? '');

if (empty($title) || empty($description) || empty($email)) {
    sendResponse("error", "Veuillez remplir tous les champs du formulaire de contact.", [], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse("error", "Format d'adresse e-mail invalide.", [], 400);
}

try {
    // 1. Envoyer le mail de notification à l'entreprise (Julie et José)
    $companyEmail = "contact@vitegourmand.fr";
    $subject = "Nouveau message de contact : $title";
    
    $body = "Vous avez reçu un nouveau message depuis le formulaire de contact de l'application :\n\n";
    $body .= "EXPÉDITEUR : $email\n";
    $body .= "SUJET : $title\n\n";
    $body .= "DESCRIPTION :\n";
    $body .= "$description\n\n";
    $body .= "------------------------------------------------------------\n";
    $body .= "Veuillez répondre directement à l'expéditeur en écrivant à : $email\n";

    sendMockEmail($companyEmail, $subject, $body);

    sendResponse("success", "Votre message de contact a bien été envoyé. Nous vous répondrons dans les plus brefs délais.");

} catch (Exception $e) {
    sendResponse("error", "Erreur technique d'envoi du message.", ["debug" => $e->getMessage()], 500);
}
