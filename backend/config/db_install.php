<?php
/**
 * Script d'installation automatique de la base de données
 * (Crée la base de données, les tables, et injecte les données de test)
 */

require_once __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

echo "============================================================\n";
echo "INSTALLATION DE LA BASE DE DONNÉES VITE & GOURMAND\n";
echo "============================================================\n\n";

try {
    // 1. Connexion temporaire sans base de données pour pouvoir la créer
    $dsn = "mysql:host=" . DB_HOST . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    
    echo "[1/4] Connexion au serveur MySQL réussie.\n";
    
    // 2. Lire et exécuter le schéma SQL
    $schemaFile = dirname(dirname(__DIR__)) . '/database/schema.sql';
    if (!file_exists($schemaFile)) {
        throw new Exception("Le fichier schema.sql est introuvable à l'emplacement : $schemaFile");
    }
    
    $schemaSql = file_get_contents($schemaFile);
    echo "[2/4] Lecture de schema.sql réussie. Exécution des requêtes...\n";
    
    // Exécuter le schéma (multi-requêtes)
    $pdo->exec($schemaSql);
    echo "      -> Base de données et tables créées avec succès.\n";
    
    // 3. Se reconnecter avec la base de données sélectionnée pour exécuter les seeds
    $pdo->exec("USE `" . DB_NAME . "`");
    
    $seedsFile = dirname(dirname(__DIR__)) . '/database/seeds.sql';
    if (!file_exists($seedsFile)) {
        throw new Exception("Le fichier seeds.sql est introuvable à l'emplacement : $seedsFile");
    }
    
    $seedsSql = file_get_contents($seedsFile);
    echo "[3/4] Lecture de seeds.sql réussie. Exécution des requêtes d'injection...\n";
    
    // Exécuter les seeds (multi-requêtes)
    $pdo->exec($seedsSql);
    echo "      -> Données initiales (rôles, utilisateurs de test, horaires, menus, plats, allergènes) injectées.\n";
    
    echo "\n[4/4] INSTALLATION TERMINÉE AVEC SUCCÈS !\n\n";
    echo "Vous pouvez maintenant utiliser l'application avec les identifiants de test :\n";
    echo "- Administrateur (José) : jose@vitegourmand.fr (Mot de passe : Password123!)\n";
    echo "- Employé (Julie) : julie@vitegourmand.fr (Mot de passe : Password123!)\n";
    echo "- Client de démonstration : client@demo.fr (Mot de passe : Password123!)\n";
    
} catch (Exception $e) {
    http_response_code(500);
    echo "\n[ERREUR FATALE] L'installation a échoué :\n";
    echo $e->getMessage() . "\n";
    echo "\nVérifiez que le serveur MySQL est démarré et que les identifiants dans 'backend/config/db.php' sont corrects.\n";
}
