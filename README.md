# Vite & Gourmand - Traiteur Gastronomique de Luxe à Bordeaux

Ce projet est une application web moderne (SPA) développée pour l'entreprise **Vite & Gourmand** dirigée par Julie et José. L'application permet aux visiteurs de consulter la carte des menus, de filtrer les offres, d'estimer et de commander des repas de groupe. Elle intègre également des espaces personnalisés pour le suivi des commandes (Clients) et la gestion complète du catalogue, des stocks, des horaires, de la modération des avis et du reporting financier (Employés et Administrateurs).

---

## 🌟 Fonctionnalités Clés

1. **SPA Dynamique** : Navigation fluide sans rechargement de page.
2. **Filtrage Intelligent** : Recherche de menus par mot-clé, prix maximum, thématiques (Noël, Pâques, classique, événement) et régimes alimentaires (classique, végétarien, vegan).
3. **Calculateur de Commande** : Calcul automatique des prix, de la réduction de groupe (10% pour toute commande avec min. 5 personnes au-dessus du seuil du menu), et des frais de livraison hors Bordeaux (5,00 € + 0,59 €/km).
4. **Espace Client** : Modification du profil, suivi de commande en temps réel, annulation (si la commande est en attente) et dépôt d'avis (si la commande est terminée).
5. **Espace Employé & Admin** : 
   - Modification et suppression des menus, plats, horaires d'ouverture.
   - Modération des avis clients (approbation pour affichage en page d'accueil ou rejet).
   - Gestion des statuts de commandes (en attente, acceptée, en préparation, en livraison, livrée, retour matériel, terminée).
   - *Règle d'annulation* : Obligation côté employé de motiver toute annulation de commande après contact direct par appel GSM ou e-mail.
6. **Espace Administrateur Exclusif** :
   - Création et désactivation des comptes employés.
   - Graphique analytique consolidé comparant les commandes et les ventes par menu en temps réel, connecté à une base de données NoSQL MongoDB (avec système de repli automatique).
7. **Accessibilité (RGAA)** : Respect de la structure sémantique HTML5, navigation au clavier et contrastes.
8. **Sécurité & RGPD** : Hachage sécurisé Bcrypt des mots de passe, requêtes préparées PDO contre les injections SQL, échappement HTML contra les attaques XSS et recueil du consentement utilisateur.

---

## 📂 Structure du Projet

```text
vite-gourmand/
├── backend/
│   ├── api/
│   │   ├── contact.php
│   │   ├── create-order.php
│   │   ├── get-menu-detail.php
│   │   ├── get-menus.php
│   │   ├── get-orders.php
│   │   ├── get-statistics.php
│   │   ├── manage-catalog.php
│   │   ├── manage-employees.php
│   │   ├── submit-review.php
│   │   ├── validate-review.php
│   │   └── get-reviews.php
│   ├── auth/
│   │   ├── get-session.php
│   │   ├── login.php
│   │   ├── logout.php
│   │   ├── register.php
│   │   └── reset-password.php
│   ├── config/
│   │   ├── db.php             # Connexion MySQL PDO
│   │   ├── db_install.php     # Script d'installation automatique SQL
│   │   └── mongodb.php        # Connexion MongoDB / NoSQL Fallback
│   ├── data/
│   │   ├── email_logs.txt     # Log d'envoi d'e-mails simulés
│   │   └── nosql_fallback.json# Fichier de stockage NoSQL de secours
│   └── utils/
│       └── helpers.php        # Réponses JSON, Session, Email mocks
├── database/
│   ├── schema.sql             # Script de création des tables MySQL
│   └── seeds.sql              # Données de test et d'initialisation
├── assets/                    # Images de la charte graphique
├── index.html                 # Layout principal de l'application (SPA)
├── style.css                  # Styles CSS et Design System
└── app.js                     # Logique d'interactivité JS
```

---

## 🛠️ Instructions de Déploiement Local

### Prérequis
- Un serveur web local PHP (version 8.0 minimum) : **XAMPP**.
- Un serveur de base de données **MySQL** (généralement inclus dans XAMPP).
- Un serveur **MongoDB** démarré en local (optionnel - l'application bascule automatiquement sur un fichier JSON NoSQL simulé en cas d'absence du driver PHP ou du serveur MongoDB pour faciliter l'évaluation).

### Étape 1 : Copier les fichiers du projet
Déplacez l'intégralité du dossier `vite-gourmand/` dans le répertoire public de votre serveur local :
- XAMPP : `C:\xampp\htdocs\vite-gourmand\`

### Étape 2 : Configuration de la Base de Données
1. Assurez-vous que le serveur MySQL est démarré.
2. Ouvrez le fichier `backend/config/db.php` et ajustez les identifiants si nécessaire :
   - `DB_USER` (par défaut : `'root'`)
   - `DB_PASS` (par défaut : `''` sur XAMPP / `'root'` sur MAMP)
3. Ouvrez votre navigateur et accédez à l'URL suivante pour installer automatiquement les tables et insérer les données de test :
   ```text
   http://localhost/vite-gourmand/backend/config/db_install.php
   ```
4. Un message de succès s'affiche avec la liste des comptes de test configurés.

---

## 👤 Comptes de Test Générés

Pour valider les différents parcours utilisateur, connectez-vous avec les identifiants suivants (les mots de passe s'afficheront lors de l'initialisation de la base de données) :

1. **Administrateur Principal (José)** :
   - E-mail : `jose@vitegourmand.fr`
   - Droits : Accès total aux statistiques MongoDB, gestion de l'équipe (création/blocage employés), gestion du catalogue (horaires, menus, plats) et modération des avis.
2. **Employé de Service (Julie)** :
   - E-mail : `julie@vitegourmand.fr`
   - Droits : Gestion des commandes clients, modification des menus, plats, horaires d'ouverture et modération des avis.
3. **Client de Démonstration (Jean)** :
   - E-mail : `client@demo.fr`
   - Droits : Commander, éditer ses informations, suivre sa commande en temps réel, annuler (si en attente) et laisser un avis (si terminée).

---

## 📧 Inspection des E-mails & Données NoSQL
- **E-mails simulés** : Pour vérifier les notifications automatiques envoyées par l'application (inscription, bienvenue, confirmation de commande, alerte matériel de 600€ non restitué sous 10 jours, invitation d'avis), ouvrez le fichier :
  `backend/data/email_logs.txt`
- **Données NoSQL (MongoDB Fallback)** : Si le driver MongoDB n'est pas activé, les données statistiques analytiques de l'administrateur s'enregistrent en format NoSQL JSON dans :
  `backend/data/nosql_fallback.json`

---

## 🌿 Stratégie Git
Pour ce projet, les bonnes pratiques Git sont appliquées :
- `main` : Branche de production stable.
- `dev` : Branche d'intégration pour les tests.
- Les fonctionnalités sont développées sur des branches dédiées issues de `dev` (ex : `feature/auth`, `feature/orders`, `feature/stats`) puis fusionnées dans `dev` après validation.
