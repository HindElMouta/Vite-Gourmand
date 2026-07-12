<?php
/**
 * Configuration de connexion à la base de données NoSQL MongoDB
 * Avec système de repli (Fallback) automatique basé sur un fichier JSON NoSQL
 * si l'extension PHP MongoDB n'est pas installée.
 */

define('MONGO_URI', 'mongodb://localhost:27017');
define('MONGO_DB_NAME', 'vite_gourmand');

class MongoDBConn {
    private static $instance = null;
    private $client = null;
    private $dbName;
    private $isFallback = false;
    private $fallbackFile;

    private function __construct() {
        $this->dbName = MONGO_DB_NAME;
        $this->fallbackFile = dirname(__DIR__) . '/data/nosql_fallback.json';
        
        // Vérifier si l'extension MongoDB de PHP est installée et disponible
        if (class_exists('MongoDB\Client')) {
            try {
                // Utilisation de la librairie officielle MongoDB
                $this->client = new MongoDB\Client(MONGO_URI);
                // Tester la connexion
                $this->client->listDatabases();
            } catch (Exception $e) {
                // Si le serveur MongoDB local n'est pas démarré, on bascule sur le repli
                $this->isFallback = true;
            }
        } else if (class_exists('MongoDB\Driver\Manager')) {
            try {
                // Utilisation directe du driver bas niveau
                $this->client = new MongoDB\Driver\Manager(MONGO_URI);
            } catch (Exception $e) {
                $this->isFallback = true;
            }
        } else {
            // Driver absent (courant en environnement WAMP/XAMPP par défaut)
            $this->isFallback = true;
        }

        if ($this->isFallback) {
            // S'assurer que le répertoire de repli existe
            $dir = dirname($this->fallbackFile);
            if (!is_dir($dir)) {
                mkdir($dir, 0777, true);
            }
            if (!file_exists($this->fallbackFile)) {
                file_put_contents($this->fallbackFile, json_encode([]));
            }
        }
    }

    public static function getInstance() {
        if (!self::$instance) {
            self::$instance = new MongoDBConn();
        }
        return self::$instance;
    }

    /**
     * Insère un document dans la base de données NoSQL
     */
    public function insert($collectionName, $document) {
        $document['_id'] = uniqid('nosql_', true);
        $document['created_at'] = date('c');

        if ($this->isFallback) {
            // Simulation NoSQL
            $data = json_decode(file_get_contents($this->fallbackFile), true);
            if (!isset($data[$collectionName])) {
                $data[$collectionName] = [];
            }
            $data[$collectionName][] = $document;
            file_put_contents($this->fallbackFile, json_encode($data, JSON_PRETTY_PRINT));
            return true;
        } else {
            // MongoDB Réel
            try {
                $collection = $this->client->selectDatabase($this->dbName)->selectCollection($collectionName);
                $collection->insertOne($document);
                return true;
            } catch (Exception $e) {
                return false;
            }
        }
    }

    /**
     * Recherche tous les documents d'une collection
     */
    public function findAll($collectionName, $filter = []) {
        if ($this->isFallback) {
            // Simulation NoSQL
            $data = json_decode(file_get_contents($this->fallbackFile), true);
            $results = $data[$collectionName] ?? [];
            
            // Filtre basique si fourni
            if (!empty($filter)) {
                $results = array_filter($results, function($item) use ($filter) {
                    foreach ($filter as $key => $value) {
                        if (!isset($item[$key]) || $item[$key] != $value) {
                            return false;
                        }
                    }
                    return true;
                });
            }
            return array_values($results);
        } else {
            // MongoDB Réel
            try {
                $collection = $this->client->selectDatabase($this->dbName)->selectCollection($collectionName);
                $cursor = $collection->find($filter);
                return iterator_to_array($cursor);
            } catch (Exception $e) {
                return [];
            }
        }
    }

    public function isFallbackMode() {
        return $this->isFallback;
    }
}
