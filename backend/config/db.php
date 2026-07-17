<?php
/*
 * Configuration de connexion hybride à la base de données (XAMPP Local / Heroku Cloud)
 */

class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        // 1. Détection de l'environnement (Heroku vs Local)
        if (getenv('JAWSDB_URL')) {
            $jawsdb_url = parse_url(getenv('JAWSDB_URL'));
            $host = $jawsdb_url["host"];
            $db_name = substr($jawsdb_url["path"], 1);
            $username = $jawsdb_url["user"];
            $password = $jawsdb_url["pass"];
        } else {
            // Vos identifiants locaux XAMPP par défaut
            $host = "localhost";
            $db_name = "vite_gourmand";
            $username = "root";
            $password = "";
        }

        // 2. Connexion PDO
        try {
            $dsn = "mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            $this->conn = new PDO($dsn, $username, $password, $options);
        } catch (PDOException $e) {
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "message" => "Impossible de se connecter à la base de données.",
                "debug" => $e->getMessage()
            ]);
            exit();
        }
    }

    public static function getInstance() {
        if (!self::$instance) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }
}