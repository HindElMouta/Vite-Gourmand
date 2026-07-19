<?php
// Détection automatique : si on est sur Heroku, on utilise JawsDB
if (getenv('JAWSDB_URL')) {
    $jawsdb_url = parse_url(getenv('JAWSDB_URL'));
    $host = $jawsdb_url["host"];
    $username = $jawsdb_url["user"];
    $password = $jawsdb_url["pass"];
    $db_name = substr($jawsdb_url["path"], 1);
} else {
    // Vos identifiants locaux XAMPP de secours
    $host = "localhost";
    $username = "root";
    $password = "";
    $db_name = "vite_gourmand";
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Erreur de connexion à la base de données : " . $e->getMessage());
}
?>
