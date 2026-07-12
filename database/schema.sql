-- ============================================================
-- SCHÉMA DE LA BASE DE DONNÉES - VITE & GOURMAND
-- ============================================================

CREATE DATABASE IF NOT EXISTS `vite_gourmand` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `vite_gourmand`;

-- 1. Table des Rôles
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table des Utilisateurs
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `phone` VARCHAR(20) NULL,
    `postal_address` TEXT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role_id` INT NOT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table des Horaires (du lundi au dimanche)
CREATE TABLE IF NOT EXISTS `schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `day_of_week` VARCHAR(15) NOT NULL UNIQUE,
    `open_time` TIME NULL,
    `close_time` TIME NULL,
    `is_closed` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table des Menus
CREATE TABLE IF NOT EXISTS `menus` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `theme` VARCHAR(100) NOT NULL, -- e.g., Noel, Paques, classique, evenement
    `regime` VARCHAR(100) NOT NULL, -- e.g., vegetarien, vegan, classique
    `min_people` INT NOT NULL DEFAULT 1,
    `base_price` DECIMAL(10, 2) NOT NULL,
    `prep_time` VARCHAR(50) NOT NULL, -- e.g., 24h, 48h, 72h
    `stock` INT NOT NULL DEFAULT 0,
    `image_url` VARCHAR(255) NULL,
    `storage_conditions` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table des Plats (Entrée, Plat, Dessert)
CREATE TABLE IF NOT EXISTS `dishes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `course_type` ENUM('entree', 'plat', 'dessert') NOT NULL,
    `image_url` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Relation Table : Menus & Plats (Une entrée ou un plat / dessert peut être présent dans plusieurs menus)
CREATE TABLE IF NOT EXISTS `menu_dishes` (
    `menu_id` INT NOT NULL,
    `dish_id` INT NOT NULL,
    PRIMARY KEY (`menu_id`, `dish_id`),
    FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`dish_id`) REFERENCES `dishes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table des Allergènes
CREATE TABLE IF NOT EXISTS `allergens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Relation Table : Plats & Allergènes
CREATE TABLE IF NOT EXISTS `dish_allergens` (
    `dish_id` INT NOT NULL,
    `allergen_id` INT NOT NULL,
    PRIMARY KEY (`dish_id`, `allergen_id`),
    FOREIGN KEY (`dish_id`) REFERENCES `dishes` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table des Commandes
CREATE TABLE IF NOT EXISTS `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `client_last_name` VARCHAR(100) NOT NULL,
    `client_first_name` VARCHAR(100) NOT NULL,
    `client_email` VARCHAR(150) NOT NULL,
    `client_phone` VARCHAR(20) NOT NULL,
    `delivery_address` TEXT NOT NULL,
    `delivery_date` DATE NOT NULL,
    `delivery_time` TIME NOT NULL,
    `menu_id` INT NOT NULL,
    `guest_count` INT NOT NULL,
    `menu_unit_price` DECIMAL(10, 2) NOT NULL,
    `delivery_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('en_attente', 'acceptee', 'preparation', 'livraison', 'livree', 'retour_materiel', 'terminee', 'annulee') DEFAULT 'en_attente',
    `cancellation_reason` TEXT NULL,
    `cancellation_contact_method` VARCHAR(50) NULL, -- e.g., appel GSM, mail
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table de suivi des modifications de statuts de commande (historique)
CREATE TABLE IF NOT EXISTS `order_status_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `status_changed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Table des Avis Clients
CREATE TABLE IF NOT EXISTS `reviews` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL UNIQUE,
    `user_id` INT NOT NULL,
    `rating` INT NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
    `comment` TEXT NOT NULL,
    `is_validated` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
