-- ============================================================
-- DONNÉES INITIALES (SEEDS) - VITE & GOURMAND
-- ============================================================

USE `vite_gourmand`;

-- 1. Insertion des Rôles
INSERT INTO `roles` (`id`, `name`) VALUES
(1, 'admin'),
(2, 'employe'),
(3, 'utilisateur')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 2. Insertion des Utilisateurs
-- Le mot de passe haché correspond à 'Password123!' (généré via password_hash('Password123!', PASSWORD_DEFAULT))
-- Hash : $2y$10$U.y2.4p/Z0Wd3VnC7P6/l.t3vI2D/qD3Gf8yY1G6iP8x0B2W2B2t2
INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `phone`, `postal_address`, `password_hash`, `role_id`, `is_active`) VALUES
(1, 'José', 'Chef', 'jose@vitegourmand.fr', '0612345678', '12 Rue de la Rousselle, 33000 Bordeaux', '$2y$10$U.y2.4p/Z0Wd3VnC7P6/l.t3vI2D/qD3Gf8yY1G6iP8x0B2W2B2t2', 1, 1),
(2, 'Julie', 'Logistique', 'julie@vitegourmand.fr', '0687654321', '24 Quai de la Monnaie, 33000 Bordeaux', '$2y$10$U.y2.4p/Z0Wd3VnC7P6/l.t3vI2D/qD3Gf8yY1G6iP8x0B2W2B2t2', 2, 1),
(3, 'Jean', 'Client', 'client@demo.fr', '0699887766', '45 Rue des Trois-Conils, 33000 Bordeaux', '$2y$10$U.y2.4p/Z0Wd3VnC7P6/l.t3vI2D/qD3Gf8yY1G6iP8x0B2W2B2t2', 3, 1)
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`);

-- 3. Insertion des Horaires (Lundi au Dimanche, 8h-22h)
INSERT INTO `schedules` (`day_of_week`, `open_time`, `close_time`, `is_closed`) VALUES
('Lundi', '08:00:00', '22:00:00', 0),
('Mardi', '08:00:00', '22:00:00', 0),
('Mercredi', '08:00:00', '22:00:00', 0),
('Jeudi', '08:00:00', '22:00:00', 0),
('Vendredi', '08:00:00', '22:00:00', 0),
('Samedi', '08:00:00', '22:00:00', 0),
('Dimanche', '08:00:00', '22:00:00', 0)
ON DUPLICATE KEY UPDATE `open_time`=VALUES(`open_time`), `close_time`=VALUES(`close_time`), `is_closed`=VALUES(`is_closed`);

-- 4. Insertion des Menus
INSERT INTO `menus` (`id`, `title`, `description`, `theme`, `regime`, `min_people`, `base_price`, `prep_time`, `stock`, `image_url`, `storage_conditions`) VALUES
(1, 'Festin Aquitain', 'Une immersion gastronomique au cœur du Sud-Ouest. Ce menu d\'exception met à l\'honneur les produits nobles de nos producteurs locaux, entre terre et mer, pour une expérience sensorielle inoubliable.', 'classique', 'classique', 12, 65.00, '72h', 5, 'assets/festin_aquitain.png', 'Conserver au frais entre 0°C et +4°C. Consommer le jour même.'),
(2, 'Duo de Canard du Sud-Ouest', 'Le canard dans toute sa splendeur. Ce menu vous invite à savourer l\'alliance parfaite d\'un magret rôti rosé et d\'un confit fondant, mariés à la douceur de pommes sarladaises aux cèpes.', 'classique', 'classique', 8, 48.00, '48h', 12, 'assets/duo_canard.png', 'Conserver au frais. Préchauffer votre four à 150°C pendant 10 minutes avant de réchauffer le plat principal pendant 15 minutes.'),
(3, 'L\'Océan Bordelais Premium', 'La fraîcheur iodée du bassin d\'Arcachon livrée chez vous. Assortiment haut de gamme de coquillages, crustacés et poissons nobles sublimés par nos chefs.', 'classique', 'classique', 6, 58.00, '24h', 8, 'assets/ocean_bordelais.png', 'Conserver entre 0°C et +2°C. À consommer immédiatement après ouverture.'),
(4, 'Jardin d\'Éden Truffé', 'Une démonstration magistrale que la gastronomie végétarienne rivalise avec les plus grands classiques. Les cèpes, morilles et truffes noires subliment ce menu sain et créatif.', 'classique', 'vegetarien', 8, 42.00, '48h', 15, 'assets/jardin_eden.png', 'Conserver au frais. Plats chauds à réchauffer au four doux.'),
(5, 'Le Rossini Signature', 'Le fleuron de la cuisine bourgeoise française réinventé. Le mariage divin du filet de bœuf de Bazas et d\'un lobe entier de foie gras d\'oie poêlé, sublimé par un jus corsé à la truffe.', 'classique', 'classique', 10, 78.00, '72h', 4, 'assets/rossini_signature.png', 'Conserver au frais. Le filet de bœuf doit être réchauffé avec soin pour préserver sa cuisson.'),
(6, 'Éclat de Saison Vegan', 'Une célébration créative et raffinée du monde végétal. Sans aucun produit d\'origine animale, ce menu met en valeur la quintessence des fruits et légumes bio d\'Aquitaine.', 'classique', 'vegan', 8, 38.00, '24h', 18, 'assets/eclat_vegan.png', 'Conserver au frais. Consommer sous 24h.')
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`), `description`=VALUES(`description`), `base_price`=VALUES(`base_price`), `stock`=VALUES(`stock`);

-- 5. Insertion des Plats
INSERT INTO `dishes` (`id`, `name`, `description`, `course_type`, `image_url`) VALUES
-- Entrées
(1, 'Foie Gras de Canard Poêlé', 'Escalope de foie gras de canard, réduction de Sauternes aux figues caramélisées.', 'entree', 'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=300'),
(2, 'Huîtres d\'Arcachon N°3', 'Six huîtres fraîches accompagnées de leur crépinette tiède au poivre de Sichuan.', 'entree', 'https://images.unsplash.com/photo-1553618551-fba689030290?w=300'),
(3, 'Velouté de Cèpes du Médoc', 'Crème onctueuse aux éclats de noisettes grillées et huile de truffe blanche.', 'entree', 'https://images.unsplash.com/photo-1547592165-e1d17f1a0655?w=300'),
(4, 'Carpaccio de Saint-Jacques', 'Noix de Saint-Jacques marinées au citron vert, baies roses et aneth fraîche.', 'entree', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'),
(5, 'Asperges de Blaye Rôties', 'Asperges croquantes, sabayon tiède au crémant de Bordeaux et zeste de pamplemousse.', 'entree', 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=300'),
(6, 'Raviole Ouverte de Homard', 'Homard bleu breton, bisque onctueuse safranée et jeunes pousses d\'herbes.', 'entree', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=300'),
(7, 'Mille-feuille de Betterave et Noix', 'Betterave Chioggia, fromage de cajou aux herbes fraîches, éclats de noix de Dordogne.', 'entree', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'),
-- Plats
(8, 'Pavé de Bœuf Sauce Bordelaise', 'Pavé de bœuf de Bazas grillé, sauce aux échalotes confites au vin de Pauillac, écrasé de pommes de terre truffé.', 'plat', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300'),
(9, 'Duo de Magret et Confit', 'Slices de magret rosé et cuisse croustillante confite, accompagnées de pommes sarladaises.', 'plat', 'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=300'),
(10, 'Dos de Bar de Ligne rôti', 'Bar cuit sur peau, émulsion au beurre blanc d\'Entre-deux-Mers, risotto au safran girondin.', 'plat', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300'),
(11, 'Risotto Carnaroli aux Truffes noires', 'Risotto crémeux, copeaux de truffe noire du Périgord et parmesan affiné 24 mois.', 'plat', 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=300'),
(12, 'Tournedos Rossini d\'Exception', 'Filet de bœuf tendre, tranche de foie gras de canard dorée, lamelles de truffes noires et pain brioché.', 'plat', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300'),
(13, 'Crumble de Courges et Morilles', 'Courges rôties aux épices douces, crème végétale aux morilles et crumble noisette.', 'plat', 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=300'),
-- Desserts
(14, 'Duo de Canelés et Fine Chocolat', 'Canelés croustillants maison et dôme chocolat intense de Madagascar.', 'dessert', 'https://images.unsplash.com/photo-1608219990949-e424ac54515f?w=300'),
(15, 'Tarte fine aux Poires et Armagnac', 'Feuilleté caramélisé aux poires locales flambées au vieil Armagnac.', 'dessert', 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=300'),
(16, 'Pavlova aux Fruits Exotiques', 'Meringue légère, chantilly à la vanille bourbon et coulis de mangue acidulé.', 'dessert', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300'),
(17, 'Moelleux Châtaigne et Glace Miel', 'Moelleux à la farine de châtaigne locale et glace maison au miel de Gironde.', 'dessert', 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=300'),
(18, 'Opéra Café et Cognac', 'Biscuit joconde, ganache chocolat, crème au beurre café parfumée au Cognac XO.', 'dessert', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300'),
(19, 'Trio canelés vegan & compotée d\'abricots', 'Canelés revisités sans lait ni œufs, et compotée d\'abricots de pays au romarin.', 'dessert', 'https://images.unsplash.com/photo-1608219990949-e424ac54515f?w=300')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `description`=VALUES(`description`);

-- 6. Association Menus & Plats
INSERT INTO `menu_dishes` (`menu_id`, `dish_id`) VALUES
-- Festin Aquitain (Menu 1)
(1, 1), (1, 2), (1, 8), (1, 14),
-- Duo de Canard (Menu 2)
(2, 3), (2, 9), (2, 15),
-- L'Océan Bordelais (Menu 3)
(3, 4), (3, 10), (3, 16),
-- Jardin d'Eden Truffé (Menu 4)
(4, 5), (4, 11), (4, 17),
-- Le Rossini Signature (Menu 5)
(5, 6), (5, 12), (5, 18),
-- Éclat de Saison Vegan (Menu 6)
(6, 7), (6, 13), (6, 19)
ON DUPLICATE KEY UPDATE `menu_id`=`menu_id`;

-- 7. Insertion des Allergènes
INSERT INTO `allergens` (`id`, `name`) VALUES
(1, 'Gluten'),
(2, 'Lactose'),
(3, 'Crustacés'),
(4, 'Poissons'),
(5, 'Fruits à coque'),
(6, 'Œufs'),
(7, 'Mollusques'),
(8, 'Moutarde')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 8. Association Plats & Allergènes
INSERT INTO `dish_allergens` (`dish_id`, `allergen_id`) VALUES
(1, 1), -- Foie Gras Poêlé (brioche/gluten)
(2, 7), -- Huîtres (mollusques)
(3, 2), (3, 5), -- Velouté (lactose, noisettes)
(4, 7), -- Saint-Jacques (mollusques)
(5, 2), (5, 6), -- Asperges (sabayon = œufs, lactose)
(6, 3), (6, 1), (6, 2), -- Raviole Homard (crustacés, gluten, lactose)
(8, 2), -- Bœuf Bordelaise (écrasé truffé = lactose)
(10, 4), (10, 2), -- Bar de ligne (poisson, beurre blanc = lactose)
(11, 2), -- Risotto (lactose)
(12, 1), (12, 2), -- Rossini (brioche = gluten, foie gras/beurre = lactose)
(13, 1), (13, 5), -- Crumble (gluten, noisette)
(14, 1), (14, 2), (14, 6), -- Canelés (gluten, lactose, œufs)
(15, 1), (15, 6), -- Tarte fine (gluten, œufs)
(16, 6), (16, 2), -- Pavlova (meringue = œufs, chantilly = lactose)
(17, 5), (17, 6), -- Moelleux (châtaigne/fruits à coque, œufs)
(18, 1), (18, 2), (18, 6), -- Opéra (gluten, lactose, œufs)
(19, 5) -- Trio vegan (canelés revisités = traces de fruits à coque)
ON DUPLICATE KEY UPDATE `dish_id`=`dish_id`;

-- 9. Insertion de quelques Commandes pour Démo
INSERT INTO `orders` (`id`, `user_id`, `client_last_name`, `client_first_name`, `client_email`, `client_phone`, `delivery_address`, `delivery_date`, `delivery_time`, `menu_id`, `guest_count`, `menu_unit_price`, `delivery_price`, `discount_amount`, `total_price`, `status`) VALUES
(1, 3, 'Client', 'Jean', 'client@demo.fr', '0699887766', '45 Rue des Trois-Conils, 33000 Bordeaux', '2026-07-02', '19:30:00', 1, 15, 65.00, 0.00, 97.50, 877.50, 'en_attente'),
(2, 3, 'Client', 'Jean', 'client@demo.fr', '0699887766', '12 Avenue Austin-Besançon, 33600 Pessac', '2026-07-05', '12:00:00', 3, 8, 58.00, 7.95, 0.00, 471.95, 'acceptee')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- 10. Insertion Historique de Statuts
INSERT INTO `order_status_history` (`order_id`, `status`) VALUES
(1, 'en_attente'),
(2, 'en_attente'),
(2, 'acceptee')
ON DUPLICATE KEY UPDATE `order_id`=`order_id`;
