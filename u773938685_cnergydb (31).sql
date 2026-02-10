-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jan 31, 2026 at 06:33 AM
-- Server version: 11.8.3-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u773938685_cnergydb`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`u773938685_archh29`@`127.0.0.1` PROCEDURE `NotifyGymCapacity` (IN `p_current_count` INT, IN `p_max_capacity` INT, IN `p_is_full` BOOLEAN)   BEGIN
    DECLARE unread_status_id INT DEFAULT 1;
    DECLARE warning_type_id INT DEFAULT 2;
    DECLARE error_type_id INT DEFAULT 4;
    DECLARE capacity_percentage DECIMAL(5,2);
    DECLARE notification_message TEXT;
    DECLARE notification_type_id INT;
    DECLARE last_notification_time DATETIME;
    
    -- Calculate percentage
    SET capacity_percentage = (p_current_count / p_max_capacity) * 100;
    
    -- Determine notification type and message
    IF p_is_full = TRUE THEN
        SET notification_type_id = error_type_id;
        SET notification_message = CONCAT('🚫 Gym Fully Occupied: The gym has reached maximum capacity (', p_current_count, '/', p_max_capacity, '). Please wait or come back later.');
        
        -- Check if we already notified in the last 5 minutes
        SELECT MAX(`timestamp`) INTO last_notification_time
        FROM `notification`
        WHERE `type_id` = error_type_id
        AND `message` LIKE '%Gym Fully Occupied%'
        AND `timestamp` > DATE_SUB(NOW(), INTERVAL 5 MINUTE);
    ELSE
        SET notification_type_id = warning_type_id;
        SET notification_message = CONCAT('⚠️ Gym Almost Full: The gym is ', ROUND(capacity_percentage, 0), '% full (', p_current_count, '/', p_max_capacity, '). Only ', (p_max_capacity - p_current_count), ' spots remaining.');
        
        -- Check if we already notified in the last 5 minutes
        SELECT MAX(`timestamp`) INTO last_notification_time
        FROM `notification`
        WHERE `type_id` = warning_type_id
        AND `message` LIKE '%Gym Almost Full%'
        AND `timestamp` > DATE_SUB(NOW(), INTERVAL 5 MINUTE);
    END IF;
    
    -- Only notify if we haven't notified in the last 5 minutes
    IF last_notification_time IS NULL THEN
        -- Insert notification for all users
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        SELECT 
            u.id,
            notification_message,
            unread_status_id,
            notification_type_id,
            NOW()
        FROM `user` u
        WHERE u.id IS NOT NULL;
    END IF;
END$$

CREATE DEFINER=`u773938685_archh29`@`127.0.0.1` PROCEDURE `SendWeeklyProgressSummary` ()   BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE user_id_var INT;
    DECLARE user_cursor CURSOR FOR 
        SELECT DISTINCT user_id FROM subscription 
        WHERE end_date > CURDATE() AND status = 'active';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN user_cursor;
    
    read_loop: LOOP
        FETCH user_cursor INTO user_id_var;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Insert weekly progress summary notification
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            user_id_var,
            '📊 Your weekly progress summary is ready! Check your dashboard to see your achievements.',
            1,
            10,
            NOW()
        );
        
    END LOOP;
    
    CLOSE user_cursor;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `account_deactivation_log`
--

CREATE TABLE `account_deactivation_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `deactivated_by` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `deactivated_at` datetime DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `achievements`
--

CREATE TABLE `achievements` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `achievements`
--

INSERT INTO `achievements` (`id`, `title`, `description`, `icon`, `created_at`) VALUES
(1, 'First Check-In', 'Awarded when a member checks in for the first time.', 'log-in', '2025-09-10 13:38:51'),
(2, 'Consistent Attendee', 'Awarded after 30 total check-ins recorded in attendance.', 'calendar', '2025-09-10 13:38:51'),
(3, 'Gym Rat', 'Awarded after 100 total check-ins recorded in attendance.', 'dumbbell', '2025-09-10 13:38:51'),
(4, '1 Month Member', 'Awarded after completing the first month of membership.', 'star', '2025-09-10 13:38:51'),
(5, '6 Months Strong', 'Awarded after being an active member for 6 months.', 'medal', '2025-09-10 13:38:51'),
(6, '1 Year Loyalty', 'Awarded after being an active member for 12 months.', 'award', '2025-09-10 13:38:51'),
(7, 'First Workout Logged', 'Awarded when a member logs their first workout in exercise log.', 'clipboard', '2025-09-10 13:38:51'),
(8, 'Strength Builder', 'Awarded after completing 500 total sets logged in workouts.', 'barbell', '2025-09-10 13:38:51'),
(9, 'Heavy Lifter', 'Awarded after logging a single set with 100kg or more.', 'trophy', '2025-09-10 13:38:51'),
(10, 'Goal Setter', 'Awarded when a member sets their first fitness goal.', 'flag', '2025-09-10 13:38:51'),
(11, 'Goal Achiever', 'Awarded when a member marks a goal as achieved.', 'trophy', '2025-09-10 13:38:51'),
(12, 'Coach Assigned', 'Awarded when a member gets their first approved coach.', 'handshake', '2025-09-10 13:38:51'),
(13, 'Feedback Giver', 'Awarded when a member submits their first coach review.', 'message-circle', '2025-09-10 13:38:51'),
(14, 'Week Warrior', 'Awarded after checking in 7 consecutive days.', 'calendar', '2025-11-14 03:21:49'),
(15, 'Month Master', 'Awarded after checking in 30 consecutive days.', 'calendar', '2025-11-14 03:21:49'),
(16, 'Perfect Week', 'Awarded after checking in every day for a full week.', 'star', '2025-11-14 03:21:49'),
(17, 'Early Bird', 'Awarded after checking in before 8 AM 10 times.', 'calendar', '2025-11-14 03:21:49'),
(18, 'Night Owl', 'Awarded after checking in after 8 PM 10 times.', 'calendar', '2025-11-14 03:21:49'),
(19, 'Weekend Warrior', 'Awarded after 20 weekend check-ins (Saturday or Sunday).', 'calendar', '2025-11-14 03:21:49'),
(20, 'Workout Enthusiast', 'Awarded after completing 10 workouts.', 'clipboard', '2025-11-14 03:21:49'),
(21, 'Workout Veteran', 'Awarded after completing 50 workouts.', 'clipboard', '2025-11-14 03:21:49'),
(22, 'Workout Master', 'Awarded after completing 100 workouts.', 'clipboard', '2025-11-14 03:21:49'),
(23, 'Perfect Session', 'Awarded after completing 5 workouts with 100% completion rate.', 'star', '2025-11-14 03:21:49'),
(24, 'Consistent Trainee', 'Awarded after completing workouts for 4 consecutive weeks.', 'calendar', '2025-11-14 03:21:49'),
(25, 'Volume King', 'Awarded after logging 1000 total sets.', 'barbell', '2025-11-14 03:21:49'),
(26, 'Volume Legend', 'Awarded after logging 2000 total sets.', 'barbell', '2025-11-14 03:21:49'),
(27, 'Intermediate Lifter', 'Awarded after logging a single set with 50kg or more.', 'trophy', '2025-11-14 03:21:49'),
(28, 'Advanced Lifter', 'Awarded after logging a single set with 150kg or more.', 'trophy', '2025-11-14 03:21:49'),
(29, 'Elite Lifter', 'Awarded after logging a single set with 200kg or more.', 'trophy', '2025-11-14 03:21:49'),
(30, 'Progressive Overload', 'Awarded after increasing weight on the same exercise 10 times.', 'barbell', '2025-11-14 03:21:49'),
(31, 'Progress Tracker', 'Awarded after logging your first body measurement.', 'clipboard', '2025-11-14 03:21:49'),
(32, 'Weight Loss Champion', 'Awarded after losing 5kg from your starting weight.', 'trophy', '2025-11-14 03:21:49'),
(33, 'Muscle Builder', 'Awarded after gaining 2kg from your starting weight.', 'trophy', '2025-11-14 03:21:49'),
(34, 'Measurement Master', 'Awarded after logging 10 body measurements.', 'clipboard', '2025-11-14 03:21:49'),
(35, 'Goal Crusher', 'Awarded after achieving 5 goals.', 'trophy', '2025-11-14 03:21:49'),
(36, 'Goal Master', 'Awarded after achieving 10 goals.', 'trophy', '2025-11-14 03:21:49'),
(37, 'Multi-Goal Setter', 'Awarded after setting 5 different goals.', 'flag', '2025-11-14 03:21:49'),
(38, 'Active Reviewer', 'Awarded after submitting 3 coach reviews.', 'message-circle', '2025-11-14 03:21:49'),
(39, 'Community Champion', 'Awarded after submitting 5 coach reviews.', 'message-circle', '2025-11-14 03:21:49'),
(40, 'Loyal Member', 'Awarded after 2 years of active membership.', 'award', '2025-11-14 03:21:49'),
(41, '500 Check-Ins', 'Awarded after 500 total check-ins.', 'dumbbell', '2025-11-14 03:21:49'),
(42, '1000 Check-Ins', 'Awarded after 1000 total check-ins.', 'dumbbell', '2025-11-14 03:21:49'),
(43, '3 Month Champion', 'Awarded after 3 months of active membership.', 'medal', '2025-11-14 03:21:49'),
(44, '2 Year Veteran', 'Awarded after 2 years of active membership.', 'award', '2025-11-14 03:21:49');

-- --------------------------------------------------------

--
-- Table structure for table `activity_log`
--

CREATE TABLE `activity_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `activity` text NOT NULL,
  `timestamp` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `activity_log`
--

INSERT INTO `activity_log` (`id`, `user_id`, `activity`, `timestamp`) VALUES
(1, NULL, 'Add Product: New product added: Vitamilk - Price: ?48, Stock: 8, Category: Beverages', '2025-11-26 10:37:51'),
(2, NULL, 'Add Product: New product added: Cnergy Shirt - Price: ?100, Stock: 11, Category: Uncategorized', '2025-11-26 10:38:37'),
(3, NULL, 'Add Product: New product added: Key Chain - Price: ?80, Stock: 8, Category: Merch/Apparel', '2025-11-26 10:39:25'),
(4, NULL, 'Update Product: Product updated: Cnergy Shirt - Price: ?100, Category: Merch/Apparel', '2025-11-26 10:39:35'),
(5, NULL, 'Add Product: New product added: Whey Gold Standard - Price: ?80, Stock: 15, Category: Supplements', '2025-11-26 10:41:08'),
(6, NULL, 'Add Product: New product added: Amino Capstule 1 per capsule - Price: ?10, Stock: 10, Category: Supplements', '2025-11-26 10:42:05'),
(7, NULL, 'Add Product: New product added: Cenergy Towel - Price: ?100, Stock: 12, Category: Merch/Apparel', '2025-11-26 10:42:39'),
(8, NULL, 'Add Product: New product added: Creatine - Price: ?35, Stock: 5, Category: Supplements', '2025-11-26 10:43:32'),
(9, NULL, 'Add Product: New product added: Cnergy Cap - Price: ?200, Stock: 5, Category: Merch/Apparel', '2025-11-26 10:44:21'),
(10, NULL, 'Add Coach: New coach Kent Wilson Gildo (Array) joined the team', '2025-11-26 02:56:25'),
(11, NULL, 'Process POS Sale: POS Sale completed: Total: ?48, Payment: cash, Receipt: RCP202511263987, Change: ?2', '2025-11-26 10:57:38'),
(12, NULL, 'Process POS Sale: POS Sale completed: Total: ?100, Payment: cash, Receipt: RCP202511268703, Change: ?0', '2025-11-26 10:57:57'),
(13, NULL, 'Process POS Sale: POS Sale completed: Total: ?20, Payment: cash, Receipt: RCP202511266115, Change: ?0', '2025-11-26 10:58:18'),
(14, NULL, 'Process POS Sale: POS Sale completed: Total: ?160, Payment: cash, Receipt: RCP202511269017, Change: ?40', '2025-11-26 10:58:34'),
(15, 1, 'Add Member: New member added - Joanne Sagiahon (joanne@gmail.com)', '2025-11-26 03:01:08'),
(16, 1, 'Tag User for Discount: Tagged Joanne Sagiahon (ID: 4) as Student discount eligible', '2025-11-26 03:01:11'),
(17, 1, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Joanne Sagiahon by Admin', '2025-11-26 11:01:13'),
(18, 1, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Joanne Sagiahon by Admin', '2025-11-26 11:01:13'),
(19, 2, 'Update Member Status: Member account approved: Dodong Noynay (ID: 5)', '2025-11-26 03:13:59'),
(20, 2, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Dodong Noynay by Admin', '2025-11-26 11:13:59'),
(21, 2, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Dodong Noynay by Admin', '2025-11-26 11:13:59'),
(22, 2, 'Create Guest POS Session: Guest POS session created: Carl Mathnew (walkin) - Amount: ?150, Payment: digital, Receipt: GST202511263417, Change: ?0', '2025-11-26 11:17:44'),
(23, 4, 'Subscription approved via PayMongo payment link verification (Payment Link: link_k7unj3ib69grsWoTzsNESL48)', '2025-11-26 11:17:54'),
(24, 1, 'Assign Coach: Coach assigned to member: Joanne Sagiahon assigned to Kent Wilson Gildo by Geo James', '2025-11-26 11:19:22'),
(25, 1, 'Approve Coach Assignment with Payment: Coach assignment approved with payment: Joanne assigned to Kent Wilson by Geo James - Payment: cash, Amount: ?300.00, Received: ?300, Change: ?0, Receipt: RCP20251126686880', '2025-11-26 11:19:22'),
(26, 1, 'Create Guest POS Session: Guest POS session created: Edmarly (walkin) - Amount: ?150, Payment: cash, Receipt: GST202511260098, Change: ?0', '2025-11-26 11:20:13'),
(27, 1, 'Create Guest POS Session: Guest POS session created: Simon (walkin) - Amount: ?150, Payment: digital, Receipt: GST202511263396, Change: ?0', '2025-11-26 11:20:47'),
(28, NULL, 'Update Stock: Stock updated for Amino Capstule 1 per capsule: add 50 units', '2025-11-26 11:21:21'),
(29, NULL, 'Update Stock: Stock updated for Vitamilk: add 42 units', '2025-11-26 11:21:27'),
(30, NULL, 'Update Stock: Stock updated for Cnergy Shirt: add 23 units', '2025-11-26 11:21:43'),
(31, NULL, 'Add Product: New product added: Gatorade - Price: ?48, Stock: 32, Category: Beverages', '2025-11-26 11:22:25'),
(32, NULL, 'Add Coach: New coach Rj louise tan (Array) joined the team', '2025-11-26 03:23:48'),
(33, NULL, 'Update Coach: Coach profile updated: Rj louise Tan', '2025-11-26 03:24:19'),
(34, NULL, 'Guest session created: Mel Macaryow (walkin) - Amount: ?150 - Payment: online', '2025-11-26 03:29:22'),
(35, NULL, 'Guest session payment verified and approved: Mel Macaryow (Session ID: 4)', '2025-11-26 03:29:59'),
(36, 2, 'Update Member Status: Member account approved: Cjay Gallegos (ID: 7)', '2025-11-26 03:33:28'),
(37, 2, 'Tag User for Discount: Tagged Cjay Gallegos (ID: 7) as Student discount eligible', '2025-11-26 03:33:28'),
(38, 2, 'Create Manual Subscription: Manual subscription created: Monthly Access (Standard) (1 month) for Cjay Gallegos by Admin', '2025-11-26 11:33:28'),
(39, 1, 'Assign Coach: Coach assigned to member: Raziel Jabulan assigned to Kent Wilson Gildo by Geo James', '2025-11-26 11:37:25'),
(40, 1, 'Approve Coach Assignment with Payment: Coach assignment approved with payment: Raziel assigned to Kent Wilson by Geo James - Payment: gcash, Amount: ?3200.00, Received: ?3200, Change: ?0, Receipt: 20234923829', '2025-11-26 11:37:25'),
(41, 2, 'Add Member: New member added - Mae versoza (versozamae@gmail.com)', '2025-11-26 03:38:53'),
(42, 2, 'Tag User for Discount: Tagged Mae versoza (ID: 8) as Senior discount eligible', '2025-11-26 03:38:53'),
(43, 2, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Mae versoza by Admin', '2025-11-26 11:38:53'),
(44, 2, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Mae versoza by Admin', '2025-11-26 11:38:53'),
(45, 1, 'Member Checkout: Member Raziel Jabulan checked out successfully! Session: 28m', '2025-11-26 11:42:01'),
(46, 2, 'Member Checkout: Member Cjay Gallegos checked out successfully! Session: 19m', '2025-11-26 11:52:51'),
(47, 2, 'Update Member Status: Member account approved: Jerry Gildo (ID: 9)', '2025-11-26 03:59:58'),
(48, 2, 'Tag User for Discount: Tagged Jerry Gildo (ID: 9) as Student discount eligible', '2025-11-26 03:59:58'),
(49, 2, 'Create Manual Subscription: Manual subscription created: Gym Session (1 month) for Jerry Gildo by Admin', '2025-11-26 11:59:58'),
(50, NULL, 'Update Stock: Stock updated for Creatine: add 60 units', '2025-11-26 12:02:31'),
(51, 2, 'Add Member: New member added - francis gildo (francisgildo@gmail.com)', '2025-11-26 05:11:05'),
(52, 2, 'Tag User for Discount: Tagged francis gildo (ID: 10) as Student discount eligible', '2025-11-26 05:11:05'),
(53, 2, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for francis gildo by Admin', '2025-11-26 13:11:06'),
(54, 2, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for francis gildo by Admin', '2025-11-26 13:11:06'),
(55, 1, 'Update Member Status: Member account approved: Francis Baron Uyguangco (ID: 11)', '2025-11-26 05:30:09'),
(56, 1, 'Tag User for Discount: Tagged Francis Baron Uyguangco (ID: 11) as Student discount eligible', '2025-11-26 05:30:09'),
(57, 1, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Francis Baron Uyguangco by Admin', '2025-11-26 13:30:10'),
(58, 1, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Francis Baron Uyguangco by Admin', '2025-11-26 13:30:10'),
(59, 1, 'Assign Coach: Coach assigned to member: Francis Baron Uyguangco assigned to Kent Wilson Gildo by Geo James', '2025-11-26 13:49:22'),
(60, 1, 'Approve Coach Assignment with Payment: Coach assignment approved with payment: Francis Baron assigned to Kent Wilson by Geo James - Payment: gcash, Amount: ?3200.00, Received: ?3200, Change: ?0, Receipt: 20301003841213', '2025-11-26 13:49:22'),
(61, 11, 'Subscription approved via PayMongo payment link verification (Payment Link: link_6JBEQpa5guwXfTo3XXtEunJv)', '2025-11-26 13:53:03'),
(62, NULL, 'Auto Checkout: Guest session auto checked out: Carl Mathnew (ID: 1) - Expired at 9 PM - Duration: 9h 42m', '2025-11-28 16:12:41'),
(63, NULL, 'Auto Checkout: Guest session auto checked out: Edmarly (ID: 2) - Expired at 9 PM - Duration: 9h 39m', '2025-11-28 16:12:41'),
(64, NULL, 'Auto Checkout: Guest session auto checked out: Simon (ID: 3) - Expired at 9 PM - Duration: 9h 39m', '2025-11-28 16:12:41'),
(65, NULL, 'Auto Checkout: Guest session auto checked out: Mel Macaryow (ID: 4) - Expired at 9 PM - Duration: 9h 30m', '2025-11-28 16:12:41'),
(66, NULL, 'Add Member: New member added - Jason Lemuel (lemy@gmail.com)', '2025-11-29 14:18:25'),
(67, NULL, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Jason Lemuel by Admin', '2025-11-29 22:18:26'),
(68, NULL, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Jason Lemuel by Admin', '2025-11-29 22:18:26'),
(70, NULL, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Honey Lim by Admin', '2025-11-29 22:21:50'),
(71, NULL, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Honey Lim by Admin', '2025-11-29 22:21:50'),
(72, NULL, 'Add Member: New member added - Edward Cy (cy@gmail.com)', '2025-11-29 15:05:30'),
(73, NULL, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Edward Cy by Admin', '2025-11-29 23:05:30'),
(74, NULL, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Edward Cy by Admin', '2025-11-29 23:05:30'),
(75, NULL, 'Guest session created: nigger tan (walkin) - Amount: ?150 - Payment: online', '2026-01-20 07:52:27'),
(76, NULL, 'Guest session payment verified and approved: nigger tan (Session ID: 5)', '2026-01-20 07:53:01'),
(77, NULL, 'Guest session payment verified and approved: nigger tan (Session ID: 5)', '2026-01-20 07:53:01'),
(78, NULL, 'Guest session created: john 3:16 (walkin) - Amount: ?150 - Payment: online', '2026-01-20 08:02:44'),
(79, NULL, 'Guest session created: hiiii (walkin) - Amount: ?150 - Payment: online', '2026-01-20 08:04:24'),
(80, NULL, 'Guest session payment verified and approved: hiiii (Session ID: 7)', '2026-01-20 08:04:46'),
(81, NULL, 'Guest session payment verified and approved: hiiii (Session ID: 7)', '2026-01-20 08:04:46'),
(82, NULL, 'Guest session created: hrrr (walkin) - Amount: ?150 - Payment: cash', '2026-01-20 08:10:55'),
(83, NULL, 'Guest session cancelled: hrrr (ID: 8)', '2026-01-20 08:11:02'),
(84, NULL, 'Auto Checkout: Guest session auto checked out: nigger tan (ID: 5) - Expired at 9 PM - Duration: 5h 7m', '2026-01-20 21:58:51'),
(85, NULL, 'Auto Checkout: Guest session auto checked out: hiiii (ID: 7) - Expired at 9 PM - Duration: 4h 55m', '2026-01-20 21:58:51'),
(86, NULL, 'Guest session created: ss (walkin) - Amount: ?150 - Payment: cash', '2026-01-21 10:07:46'),
(87, NULL, 'Guest session created: frf (walkin) - Amount: ?150 - Payment: online', '2026-01-21 10:33:38'),
(88, 6, 'Add Member: New member added - Harley Dave (dave@gmail.com)', '2026-01-22 17:57:18'),
(89, 6, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Harley Dave by Admin', '2026-01-23 01:57:19'),
(90, 6, 'Add Member: New member added - JunJun Juniebvoy (junie@gmail.com)', '2026-01-22 18:19:00'),
(91, 6, 'Create Manual Subscription: Manual subscription created: Gym Session (1 month) for JunJun Juniebvoy by Admin', '2026-01-23 02:19:01'),
(92, 6, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for JunJun Juniebvoy by Admin', '2026-01-23 02:19:01'),
(93, 6, 'Add Member: New member added - young bloood (blooda@gmail.com)', '2026-01-22 18:25:36'),
(94, 6, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for young bloood by Admin', '2026-01-23 02:25:37'),
(95, 6, 'Add Member: New member added - King Henry (henrycy@gmail.com)', '2026-01-22 18:39:28'),
(96, 6, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for King Henry by Admin', '2026-01-23 02:39:29'),
(97, 6, 'Add Member: New member added - Jmmy Jim (jim@gmail.com)', '2026-01-22 18:44:27'),
(98, 6, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Jmmy Jim by Admin', '2026-01-23 02:44:27'),
(99, 6, 'Update Member: Member updated - Jmmy Jim (ID: 19)', '2026-01-22 19:01:47'),
(100, 6, 'Add Member: New member added - jhuh hbg (hbhg@gmail.com)', '2026-01-22 19:08:37'),
(101, 6, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for jhuh hbg by Admin', '2026-01-23 03:08:38'),
(102, NULL, 'Guest session created: asd (walkin) - Amount: ?150 - Payment: online', '2026-01-23 12:17:05'),
(103, NULL, 'Guest session created: francis (walkin) - Amount: ?150 - Payment: online', '2026-01-25 09:27:36'),
(104, 6, 'Update Member Status: Member account approved: Rjay Tan (ID: 21)', '2026-01-25 09:28:31'),
(105, 6, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Rjay Tan by Admin', '2026-01-25 17:28:31'),
(106, 6, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Rjay Tan by Admin', '2026-01-25 17:28:31'),
(107, NULL, 'Guest session created: hell nah (walkin) - Amount: ?150 - Payment: online', '2026-01-25 09:33:01'),
(108, 6, 'Update Member Status: Member account approved: Jay Lou (ID: 22)', '2026-01-25 09:44:12'),
(109, 6, 'Update Member: Member updated - Jay Lou (ID: 22)', '2026-01-25 09:44:13'),
(110, 6, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Jay Lou by Admin', '2026-01-25 17:44:13'),
(111, 6, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Jay Lou by Admin', '2026-01-25 17:44:13'),
(112, 6, 'Member Checkin: Member Rjay Tan checked in successfully!', '2026-01-25 17:54:33'),
(113, 6, 'Member Checkout: Member Rjay Tan checked out successfully! Session: 0m', '2026-01-25 17:55:13'),
(114, 6, 'Update Member: Member updated - Jay Lou (ID: 22)', '2026-01-25 10:32:00'),
(115, NULL, 'Update Member: Member updated - Rjay Tan (ID: 21)', '2026-01-25 10:53:51'),
(116, NULL, 'Member Checkin: Member Rjay Tan checked in successfully!', '2026-01-26 13:13:45'),
(117, NULL, 'Member Checkout: Member Rjay Tan checked out successfully! Session: 7m', '2026-01-26 13:21:23'),
(118, NULL, 'Update Member: Member updated - Jmmy Jim (ID: 19)', '2026-01-26 05:30:24'),
(119, NULL, 'Update Member: Member updated - Jmmy Jim (ID: 19)', '2026-01-26 05:30:51'),
(120, NULL, 'Update Member: Member updated - Jerry Gildo (ID: 9)', '2026-01-26 05:41:17'),
(122, NULL, 'Create Manual Subscription: Manual subscription created: Gym Session (1 month) for David GoliGOli by Admin', '2026-01-26 13:47:12'),
(123, NULL, 'Member Checkin: Member David GoliGOli checked in successfully!', '2026-01-26 13:57:41'),
(124, NULL, 'Member Checkout: Member David GoliGOli checked out successfully! Session: 13m', '2026-01-26 14:11:24'),
(125, NULL, 'Add Member: New member added - Harley Davidson (d@gmail.com)', '2026-01-26 06:12:55'),
(126, NULL, 'Create Manual Subscription: Manual subscription created: Gym Session (1 month) for Harley Davidson by Admin', '2026-01-26 14:12:55'),
(127, NULL, 'Member Checkin: Member Harley Davidson checked in successfully!', '2026-01-26 14:13:17'),
(128, NULL, 'Member Checkout: Member Harley Davidson checked out successfully! Session: 5m', '2026-01-26 14:18:34'),
(130, NULL, 'Create Manual Subscription: Manual subscription created: Gym Session (1 month) for Lim li by Admin', '2026-01-26 14:20:06'),
(131, NULL, 'Member Checkin: Member Lim li checked in successfully!', '2026-01-26 14:22:47'),
(132, NULL, 'Member Checkout: Member Lim li checked out successfully! Session: 3m', '2026-01-26 14:26:45'),
(134, NULL, 'Create Manual Subscription: Manual subscription created: Gym Session (1 month) for ZOm zom by Admin', '2026-01-26 14:31:14'),
(135, NULL, 'Member Checkin: Member ZOm zom checked in successfully!', '2026-01-26 14:31:46'),
(136, NULL, 'Member Checkout: Member ZOm zom checked out successfully! Session: 4m', '2026-01-26 14:36:42'),
(137, NULL, 'Add Member: New member added - LAm la (lamio@gmail.com)', '2026-01-26 06:41:15'),
(138, NULL, 'Create Manual Subscription: Manual subscription created: Gym Session (1 month) for LAm la by Admin', '2026-01-26 14:41:15'),
(139, NULL, 'Member Checkin: Member LAm la checked in successfully!', '2026-01-26 14:41:38'),
(140, NULL, 'Member Checkout: Member LAm la checked out successfully! Session: 14m', '2026-01-26 14:56:04'),
(142, NULL, 'Create Manual Subscription: Manual subscription created: Gym Session (1 month) for James Lemmy by Admin', '2026-01-27 01:30:34'),
(143, NULL, 'Member Checkin: Member James Lemmy checked in successfully!', '2026-01-27 01:30:59'),
(144, 6, 'Member Checkout: Member James Lemmy checked out successfully! Session: 1m', '2026-01-27 01:32:08'),
(145, 6, 'Add Member: New member added - Domm Dom (dom@gmail.com)', '2026-01-26 17:40:45'),
(146, 6, 'Create Manual Subscription: Manual subscription created: Gym Session (1 month) for Domm Dom by Admin', '2026-01-27 01:40:46'),
(147, 6, 'Member Checkin: Member Domm Dom checked in successfully!', '2026-01-27 01:41:08'),
(148, 6, 'Member Checkout: Member Domm Dom checked out successfully! Session: 1m', '2026-01-27 01:42:55'),
(149, 6, 'Add Member: New member added - le le (le@gmail.com)', '2026-01-26 17:48:09'),
(150, 6, 'Create Manual Subscription: Manual subscription created: Gym Session (1 month) for le le by Admin', '2026-01-27 01:48:09'),
(151, 6, 'Member Checkin: Member le le checked in successfully!', '2026-01-27 01:48:37'),
(152, 6, 'Member Checkout: Member le le checked out successfully! Session: 0m', '2026-01-27 01:49:36'),
(153, 6, 'Add Member: New member added - Crister Jane (jane@gmail.com)', '2026-01-26 17:50:40'),
(154, 6, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Crister Jane by Admin', '2026-01-27 01:50:41'),
(155, 6, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Crister Jane by Admin', '2026-01-27 01:50:41'),
(156, 6, 'Member Checkin: Member Crister Jane checked in successfully!', '2026-01-27 01:51:44'),
(157, 6, 'Member Checkout: Member Crister Jane checked out successfully! Session: 0m', '2026-01-27 01:52:28'),
(158, 2, 'Create Guest POS Session: Guest POS session created: JunJun (walkin) - Amount: ?150, Payment: cash, Receipt: GST202601270851, Change: ?50', '2026-01-27 02:25:14'),
(159, 1, 'Create Guest POS Session: Guest POS session created: Remrem (walkin) - Amount: ?150, Payment: cash, Receipt: GST202601271244, Change: ?50', '2026-01-27 02:25:40'),
(160, NULL, 'Process POS Sale: POS Sale completed: Total: ?240, Payment: cash, Receipt: RCP202601275277, Change: ?260', '2026-01-27 02:27:04'),
(161, 2, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Crister Jane by Admin', '2026-01-27 02:36:25'),
(162, 2, 'Assign Coach: Coach assigned to member: Edward Cy assigned to Rj louise Tan by Christian Noynay', '2026-01-27 02:37:04'),
(163, 2, 'Approve Coach Assignment with Payment: Coach assignment approved with payment: Edward assigned to Rj louise by Christian Noynay - Payment: cash, Amount: ?3200.00, Received: ?4999.73, Change: ?1799.73, Receipt: RCP20260127275413', '2026-01-27 02:37:05'),
(164, NULL, 'Process POS Sale: POS Sale completed: Total: ?400, Payment: cash, Receipt: RCP202601278967, Change: ?1600', '2026-01-27 02:38:19'),
(165, 2, 'Process POS Sale: POS Sale completed: Total: ?400, Payment: cash, Receipt: RCP202601274377, Change: ?2600', '2026-01-27 15:05:19'),
(166, NULL, 'Auto Checkout: Guest session auto checked out: JunJun (ID: 14) - Expired at 9 PM - Duration: 18h 34m', '2026-01-28 10:41:42'),
(167, NULL, 'Auto Checkout: Guest session auto checked out: Remrem (ID: 15) - Expired at 9 PM - Duration: 18h 34m', '2026-01-28 10:41:42'),
(168, 1, 'Update Member Status: Member account approved: Rjayy Tan (ID: 32)', '2026-01-28 02:54:14'),
(169, 1, 'Tag User for Discount: Tagged Rjayy Tan (ID: 32) as Student discount eligible', '2026-01-28 02:54:15'),
(170, 1, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Rjayy Tan by Admin', '2026-01-28 10:54:15'),
(171, 1, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Rjayy Tan by Admin', '2026-01-28 10:54:15'),
(172, 1, 'Member Checkin: Member Rjayy Tan checked in successfully!', '2026-01-28 10:58:05'),
(173, 1, 'Process POS Sale: POS Sale completed: Total: ?144, Payment: cash, Receipt: RCP202601283003, Change: ?56', '2026-01-28 11:01:55'),
(174, NULL, 'Update Stock: Stock updated for Gatorade: add 60 units', '2026-01-28 11:04:35'),
(175, 1, 'Member Checkout: Member Rjayy Tan checked out successfully! Session: 10m', '2026-01-28 11:08:50'),
(176, 1, 'Add Member: New member added - Won Wan (wan@gmail.com)', '2026-01-30 05:52:07'),
(177, 1, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Won Wan by Admin', '2026-01-30 13:52:09'),
(178, 1, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Won Wan by Admin', '2026-01-30 13:52:09'),
(179, 1, 'Update Member Status: Member account approved: Limey Skirt (ID: 34)', '2026-01-30 06:25:30'),
(180, 1, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for Limey Skirt by Admin', '2026-01-30 14:25:31'),
(181, 1, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Limey Skirt by Admin', '2026-01-30 14:25:31'),
(182, 1, 'Add Member: New member added - Rendon Lavrador (lavvy@gmail.com)', '2026-01-30 07:26:01'),
(183, 1, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for Rendon Lavrador by Admin', '2026-01-30 15:26:01'),
(184, 1, 'Process POS Sale: POS Sale completed: Total: ?140, Payment: cash, Receipt: RCP202601308152, Change: ?60', '2026-01-30 15:26:36'),
(185, 1, 'Add Member: New member added - LAbitad tadtad (taddy@gmail.com)', '2026-01-30 08:14:19'),
(186, 1, 'Create Manual Subscription: Manual subscription created: Gym Membership (1 month) for LAbitad tadtad by Admin', '2026-01-30 16:14:19'),
(187, 1, 'Create Manual Subscription: Manual subscription created: Monthly Access (Premium) (1 month) for LAbitad tadtad by Admin', '2026-01-30 16:14:19'),
(188, 1, 'Member Checkin: Member Crister Jane checked in successfully!', '2026-01-30 16:40:14');

-- --------------------------------------------------------

--
-- Table structure for table `admin_activity_log`
--

CREATE TABLE `admin_activity_log` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcement`
--

CREATE TABLE `announcement` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `date_posted` datetime DEFAULT current_timestamp(),
  `start_date` date NOT NULL DEFAULT curdate(),
  `end_date` date DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `priority` enum('low','medium','high') DEFAULT 'low'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `guest_session_id` int(11) DEFAULT NULL,
  `check_in` datetime NOT NULL,
  `check_out` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `user_id`, `guest_session_id`, `check_in`, `check_out`) VALUES
(1, 4, NULL, '2025-11-26 11:01:13', '2025-11-26 13:24:15'),
(2, 5, NULL, '2025-11-26 11:13:59', '2025-11-26 11:42:01'),
(3, 7, NULL, '2025-11-26 11:33:28', '2025-11-26 11:52:51'),
(4, 8, NULL, '2025-11-26 11:38:53', '2025-11-26 13:24:15'),
(5, 9, NULL, '2025-11-26 11:59:58', '2025-11-26 13:24:15'),
(6, 10, NULL, '2025-11-26 13:11:06', '2025-11-26 13:24:15'),
(7, 11, NULL, '2025-11-26 13:30:10', '2025-11-26 13:24:15'),
(8, 21, NULL, '2026-01-25 17:54:33', '2026-01-25 17:55:13'),
(9, 21, NULL, '2026-01-26 13:13:45', '2026-01-26 13:21:23'),
(10, 23, NULL, '2026-01-26 13:57:41', '2026-01-26 14:11:24'),
(11, 24, NULL, '2026-01-26 14:13:17', '2026-01-26 14:18:34'),
(12, 25, NULL, '2026-01-26 14:22:47', '2026-01-26 14:26:45'),
(13, 26, NULL, '2026-01-26 14:31:46', '2026-01-26 14:36:42'),
(14, 27, NULL, '2026-01-26 14:41:38', '2026-01-26 14:56:04'),
(15, 28, NULL, '2026-01-27 01:30:59', '2026-01-27 01:32:08'),
(16, 29, NULL, '2026-01-27 01:41:08', '2026-01-27 01:42:55'),
(17, 30, NULL, '2026-01-27 01:48:37', '2026-01-27 01:49:36'),
(18, 31, NULL, '2026-01-27 01:51:44', '2026-01-27 01:52:28'),
(19, 32, NULL, '2026-01-28 10:58:05', '2026-01-28 11:08:50'),
(20, 31, NULL, '2026-01-30 16:40:14', '2026-01-30 15:10:44');

--
-- Triggers `attendance`
--
DELIMITER $$
CREATE TRIGGER `notify_gym_capacity` AFTER INSERT ON `attendance` FOR EACH ROW BEGIN
    DECLARE p_current_count INT;
    DECLARE p_max_capacity INT DEFAULT 50;
    DECLARE capacity_percentage DECIMAL(5,2);
    DECLARE last_notification_time DATETIME;
    DECLARE notification_message VARCHAR(500);
    DECLARE notification_type_id INT;
    DECLARE unread_status_id INT DEFAULT 1;
    DECLARE warning_type_id INT DEFAULT 2;
    DECLARE error_type_id INT DEFAULT 4;
    
    -- Count current active check-ins (checked in today, not checked out)
    SELECT COUNT(*) INTO p_current_count
    FROM attendance
    WHERE DATE(check_in) = CURDATE()
    AND check_out IS NULL;
    
    -- Calculate capacity percentage
    SET capacity_percentage = (p_current_count / p_max_capacity) * 100;
    
    -- Determine notification type and message
    IF capacity_percentage >= 100 THEN
        SET notification_type_id = error_type_id;
        SET notification_message = CONCAT('Gym Fully Occupied: The gym is at maximum capacity (', p_current_count, '/', p_max_capacity, '). Please wait for space to become available.');
        
        -- Check if we already notified in the last 5 minutes
        SELECT MAX(`timestamp`) INTO last_notification_time
        FROM `notification`
        WHERE `type_id` = error_type_id
        AND `message` LIKE '%Gym Fully Occupied%'
        AND `timestamp` > DATE_SUB(NOW(), INTERVAL 5 MINUTE);
    ELSE
        SET notification_type_id = warning_type_id;
        SET notification_message = CONCAT('Gym Almost Full: The gym is ', ROUND(capacity_percentage, 0), '% full (', p_current_count, '/', p_max_capacity, '). Only ', (p_max_capacity - p_current_count), ' spots remaining.');
        
        -- Check if we already notified in the last 5 minutes
        SELECT MAX(`timestamp`) INTO last_notification_time
        FROM `notification`
        WHERE `type_id` = warning_type_id
        AND `message` LIKE '%Gym Almost Full%'
        AND `timestamp` > DATE_SUB(NOW(), INTERVAL 5 MINUTE);
    END IF;
    
    -- Only notify if we haven't notified in the last 5 minutes
    IF last_notification_time IS NULL THEN
        -- Insert notification for all users
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        SELECT 
            u.id,
            notification_message,
            unread_status_id,
            notification_type_id,
            NOW()
        FROM `user` u
        WHERE u.id IS NOT NULL;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_gym_capacity_after_checkin` AFTER INSERT ON `attendance` FOR EACH ROW BEGIN
    DECLARE current_count INT;
    DECLARE max_capacity INT DEFAULT 30;
    
    -- Count current people in gym (checked in today, not checked out)
    SELECT COUNT(*) INTO current_count
    FROM `attendance`
    WHERE DATE(`check_in`) = CURDATE()
    AND `check_out` IS NULL;
    
    -- Check if we should notify
    IF current_count >= max_capacity THEN
        -- Gym is FULL
        CALL `NotifyGymCapacity`(current_count, max_capacity, TRUE);
    ELSEIF current_count >= 24 THEN
        -- Gym is ALMOST FULL (80% or 24+ people)
        CALL `NotifyGymCapacity`(current_count, max_capacity, FALSE);
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_gym_capacity_after_checkout` AFTER UPDATE ON `attendance` FOR EACH ROW BEGIN
    DECLARE current_count INT;
    DECLARE max_capacity INT DEFAULT 30;
    
    -- Only process if check_out was just set (was NULL, now has value)
    IF OLD.`check_out` IS NULL AND NEW.`check_out` IS NOT NULL THEN
        -- Count current people in gym (checked in today, not checked out)
        SELECT COUNT(*) INTO current_count
        FROM `attendance`
        WHERE DATE(`check_in`) = CURDATE()
        AND `check_out` IS NULL;
        
        -- Check if we should notify (capacity might still be at threshold)
        IF current_count >= max_capacity THEN
            -- Gym is FULL
            CALL `NotifyGymCapacity`(current_count, max_capacity, TRUE);
        ELSEIF current_count >= 24 THEN
            -- Gym is ALMOST FULL (80% or 24+ people)
            CALL `NotifyGymCapacity`(current_count, max_capacity, FALSE);
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_denied_log`
--

CREATE TABLE `attendance_denied_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'User ID who attempted check-in (NULL for guests)',
  `guest_session_id` int(11) DEFAULT NULL COMMENT 'Guest session ID if applicable',
  `denial_reason` varchar(50) NOT NULL COMMENT 'Reason for denial: expired_plan, no_plan, guest_expired, guest_error, etc.',
  `attempted_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'When the attendance attempt was made',
  `expired_date` date DEFAULT NULL COMMENT 'Expiration date if plan expired',
  `plan_name` varchar(255) DEFAULT NULL COMMENT 'Plan name if applicable',
  `message` text DEFAULT NULL COMMENT 'Full denial message for reference',
  `entry_method` enum('qr','manual','unknown') DEFAULT 'unknown' COMMENT 'How the attendance was attempted'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Logs of denied attendance attempts';

--
-- Dumping data for table `attendance_denied_log`
--

INSERT INTO `attendance_denied_log` (`id`, `user_id`, `guest_session_id`, `denial_reason`, `attempted_at`, `expired_date`, `plan_name`, `message`, `entry_method`) VALUES
(13, 4, NULL, 'no_plan', '2025-11-26 11:41:45', NULL, NULL, '? Joanne Sagiahon - No active gym access plan found', 'qr'),
(14, 3, NULL, 'no_plan', '2025-11-26 11:42:06', NULL, NULL, '? Kent Wilson Gildo - No active gym access plan found', 'qr'),
(15, 2, NULL, 'no_plan', '2026-01-25 18:32:29', NULL, NULL, '? Christian Noynay - No active gym access plan found', 'qr'),
(16, 2, NULL, 'no_plan', '2026-01-25 18:32:55', NULL, NULL, '? Christian Noynay - No active gym access plan found', 'qr'),
(17, 2, NULL, 'no_plan', '2026-01-25 18:33:05', NULL, NULL, '? Christian Noynay - No active gym access plan found', 'qr'),
(18, 2, NULL, 'no_plan', '2026-01-25 18:33:06', NULL, NULL, '? Christian Noynay - No active gym access plan found', 'qr'),
(19, 2, NULL, 'no_plan', '2026-01-25 18:33:06', NULL, NULL, '? Christian Noynay - No active gym access plan found', 'qr'),
(20, 2, NULL, 'no_plan', '2026-01-25 18:34:55', NULL, NULL, '? Christian Noynay - No active gym access plan found', 'qr'),
(21, 2, NULL, 'no_plan', '2026-01-25 18:40:48', NULL, NULL, '? Christian Noynay - No active gym access plan found', 'qr'),
(22, 2, NULL, 'no_plan', '2026-01-25 18:40:58', NULL, NULL, '? Christian Noynay - No active gym access plan found', 'qr'),
(23, 2, NULL, 'no_plan', '2026-01-25 19:10:46', NULL, NULL, '? Christian Noynay - No active gym access plan found', 'qr'),
(24, 2, NULL, 'no_plan', '2026-01-25 19:11:57', NULL, NULL, '? Christian Noynay - No active gym access plan found', 'qr'),
(25, 19, NULL, 'no_plan', '2026-01-26 13:31:17', NULL, NULL, '? Jmmy Jim - No active gym access plan found', 'qr'),
(26, 19, NULL, 'no_plan', '2026-01-26 13:31:17', NULL, NULL, '? Jmmy Jim - No active gym access plan found', 'qr'),
(27, 19, NULL, 'no_plan', '2026-01-26 13:33:01', NULL, NULL, '? Jmmy Jim - No active gym access plan found', 'qr'),
(28, 19, NULL, 'no_plan', '2026-01-26 13:33:26', NULL, NULL, '? Jmmy Jim - No active gym access plan found', 'qr'),
(29, 19, NULL, 'no_plan', '2026-01-26 13:34:24', NULL, NULL, '? Jmmy Jim - No active gym access plan found', 'qr'),
(30, 19, NULL, 'no_plan', '2026-01-26 13:37:27', NULL, NULL, '? Jmmy Jim - No active gym access plan found', 'qr'),
(31, 19, NULL, 'no_plan', '2026-01-26 13:37:51', NULL, NULL, '? Jmmy Jim - No active gym access plan found', 'qr'),
(32, 23, NULL, 'expired_plan', '2026-01-26 13:47:48', '2026-01-26', 'Gym Session', '? David GoliGOli - Gym access expired on Jan 26, 2026', 'qr'),
(33, 23, NULL, 'expired_plan', '2026-01-26 13:51:17', '2026-01-26', 'Gym Session', '? David GoliGOli - Gym access expired on Jan 26, 2026', 'qr'),
(34, 23, NULL, 'expired_plan', '2026-01-26 13:54:46', '2026-01-26', 'Gym Session', '? David GoliGOli - Gym access expired on Jan 26, 2026', 'qr'),
(35, 17, NULL, 'no_plan', '2026-01-30 16:38:55', NULL, NULL, '? young bloood - No active gym access plan found', 'qr'),
(36, 13, NULL, 'expired_plan', '2026-01-30 16:39:37', '2025-12-29', 'Monthly Access (Premium)', '? Honey Lim - Gym access expired on Dec 29, 2025', 'qr'),
(37, 23, NULL, 'expired_plan', '2026-01-30 16:41:06', '2026-01-26', 'Gym Session', '? David GoliGOli - Gym access expired on Jan 26, 2026', 'qr'),
(38, 14, NULL, 'expired_plan', '2026-01-30 16:41:08', '2025-12-29', 'Monthly Access (Premium)', '? Edward Cy - Gym access expired on Dec 29, 2025', 'qr'),
(39, 24, NULL, 'expired_plan', '2026-01-30 16:41:12', '2026-01-26', 'Gym Session', '? Harley Davidson - Gym access expired on Jan 26, 2026', 'qr'),
(40, 20, NULL, 'no_plan', '2026-01-30 16:41:15', NULL, NULL, '? jhuh hbg - No active gym access plan found', 'qr'),
(41, 16, NULL, 'expired_plan', '2026-01-30 16:41:18', '2026-01-23', 'Gym Session', '? JunJun Juniebvoy - Gym access expired on Jan 23, 2026', 'qr'),
(42, 16, NULL, 'expired_plan', '2026-01-30 16:41:19', '2026-01-23', 'Gym Session', '? JunJun Juniebvoy - Gym access expired on Jan 23, 2026', 'qr'),
(43, 6, NULL, 'no_plan', '2026-01-30 16:41:22', NULL, NULL, '? Rj louise Tan - No active gym access plan found', 'qr');

-- --------------------------------------------------------

--
-- Table structure for table `body_measurements`
--

CREATE TABLE `body_measurements` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `weight` decimal(5,2) DEFAULT NULL COMMENT 'Weight in kg',
  `body_fat_percentage` decimal(4,2) DEFAULT NULL COMMENT 'Body fat percentage',
  `bmi` decimal(4,2) DEFAULT NULL COMMENT 'Body Mass Index',
  `chest_cm` decimal(5,2) DEFAULT NULL COMMENT 'Chest measurement in cm',
  `shoulders_cm` decimal(5,2) DEFAULT NULL COMMENT 'Shoulders measurement in cm',
  `waist_cm` decimal(5,2) DEFAULT NULL COMMENT 'Waist measurement in cm',
  `hips_cm` decimal(5,2) DEFAULT NULL COMMENT 'Hips measurement in cm',
  `arms_cm` decimal(5,2) DEFAULT NULL COMMENT 'Arms measurement in cm',
  `biceps_left_cm` decimal(5,2) DEFAULT NULL COMMENT 'Left bicep measurement in cm',
  `biceps_right_cm` decimal(5,2) DEFAULT NULL COMMENT 'Right bicep measurement in cm',
  `thighs_cm` decimal(5,2) DEFAULT NULL COMMENT 'Thighs measurement in cm',
  `notes` text DEFAULT NULL COMMENT 'Additional notes',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `body_measurements`
--

INSERT INTO `body_measurements` (`id`, `user_id`, `weight`, `body_fat_percentage`, `bmi`, `chest_cm`, `shoulders_cm`, `waist_cm`, `hips_cm`, `arms_cm`, `biceps_left_cm`, `biceps_right_cm`, `thighs_cm`, `notes`, `created_at`, `updated_at`) VALUES
(72, 4, 64.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Starting weight from profile - Account created 2025-11-26 03:01:08', '2025-11-26 03:01:08', '2025-11-26 03:12:52'),
(73, 11, 55.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Starting weight from profile - Account created 2025-11-26 05:18:45', '2025-11-26 05:18:45', '2025-11-26 05:36:54'),
(74, 21, 80.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Starting weight from profile - Account created 2026-01-25 09:24:58', '2026-01-25 09:24:58', '2026-01-25 09:56:56'),
(75, 22, 85.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Starting weight from profile - Account created 2026-01-25 09:43:47', '2026-01-25 09:43:47', '2026-01-25 10:34:34'),
(76, 26, 54.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Starting weight from profile - Account created 2026-01-26 06:31:14', '2026-01-26 06:31:14', '2026-01-26 06:31:36'),
(77, 32, 200.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Starting weight from profile - Account created 2026-01-28 02:50:06', '2026-01-28 02:50:06', '2026-01-28 03:15:33'),
(78, 34, 200.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Starting weight from profile - Account created 2026-01-30 06:25:08', '2026-01-30 06:25:08', '2026-01-30 07:13:24');

-- --------------------------------------------------------

--
-- Table structure for table `coaches`
--

CREATE TABLE `coaches` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `bio` text DEFAULT NULL,
  `specialty` varchar(255) DEFAULT NULL,
  `experience` varchar(255) DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT 0.00,
  `total_clients` int(11) DEFAULT 0,
  `image_url` text DEFAULT NULL,
  `certifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`certifications`)),
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `monthly_rate` decimal(10,2) DEFAULT NULL,
  `session_package_rate` decimal(10,2) DEFAULT NULL,
  `session_package_count` int(11) DEFAULT 18,
  `per_session_rate` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `coaches`
--

INSERT INTO `coaches` (`id`, `user_id`, `bio`, `specialty`, `experience`, `rating`, `total_clients`, `image_url`, `certifications`, `is_available`, `created_at`, `monthly_rate`, `session_package_rate`, `session_package_count`, `per_session_rate`) VALUES
(1, 3, '', NULL, 'Intermediate (2-5 years)', 0.00, 0, '', NULL, 1, '2025-11-26 02:56:25', 3200.00, NULL, NULL, 300.00),
(2, 6, '', NULL, 'Intermediate (2-5 years)', 0.00, 0, '', NULL, 1, '2025-11-26 03:23:48', 3200.00, NULL, NULL, 300.00);

-- --------------------------------------------------------

--
-- Table structure for table `coach_availability`
--

CREATE TABLE `coach_availability` (
  `id` int(11) NOT NULL,
  `coach_id` int(11) DEFAULT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coach_member_list`
--

CREATE TABLE `coach_member_list` (
  `id` int(11) NOT NULL,
  `coach_id` int(11) DEFAULT NULL,
  `member_id` int(11) DEFAULT NULL,
  `status` enum('active','expired','disconnected') DEFAULT 'expired',
  `coach_approval` enum('pending','approved','rejected') DEFAULT 'pending',
  `staff_approval` enum('pending','approved','rejected') DEFAULT 'pending',
  `requested_at` datetime DEFAULT current_timestamp(),
  `coach_approved_at` datetime DEFAULT NULL,
  `staff_approved_at` datetime DEFAULT NULL,
  `payment_received` tinyint(1) DEFAULT 0,
  `handled_by_coach` int(11) DEFAULT NULL,
  `handled_by_staff` int(11) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `remaining_sessions` int(11) DEFAULT 18,
  `rate_type` enum('monthly','package','per_session') DEFAULT 'monthly'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `coach_member_list`
--

INSERT INTO `coach_member_list` (`id`, `coach_id`, `member_id`, `status`, `coach_approval`, `staff_approval`, `requested_at`, `coach_approved_at`, `staff_approved_at`, `payment_received`, `handled_by_coach`, `handled_by_staff`, `expires_at`, `remaining_sessions`, `rate_type`) VALUES
(1, 3, 4, 'expired', 'approved', 'approved', '2025-11-26 11:19:22', '2025-11-26 11:19:22', '2025-11-26 11:19:22', 1, 3, 1, '2025-11-26 21:00:00', 18, 'per_session'),
(2, 3, 5, 'expired', 'approved', 'approved', '2025-11-26 11:37:25', '2025-11-26 11:37:25', '2025-11-26 11:37:25', 1, 3, 1, '2025-12-26 00:00:00', 18, 'monthly'),
(3, 3, 11, '', 'pending', 'pending', '2025-11-26 05:44:12', NULL, NULL, 0, NULL, NULL, '2025-12-26 00:00:00', 18, 'monthly'),
(4, 3, 11, 'expired', 'approved', 'approved', '2025-11-26 13:49:22', '2025-11-26 13:49:22', '2025-11-26 13:49:22', 1, 3, 1, '2025-12-26 00:00:00', 17, 'monthly'),
(5, 6, 14, 'active', 'approved', 'approved', '2026-01-27 02:37:04', '2026-01-27 02:37:04', '2026-01-27 02:37:04', 1, 6, 2, '2026-02-27 00:00:00', 18, 'monthly');

--
-- Triggers `coach_member_list`
--
DELIMITER $$
CREATE TRIGGER `notify_coach_coaching_expiring_soon` AFTER UPDATE ON `coach_member_list` FOR EACH ROW BEGIN
    DECLARE member_name_var VARCHAR(255);
    DECLARE days_until_expiry INT;
    DECLARE unread_status_id INT DEFAULT 1;
    DECLARE reminder_type_id INT DEFAULT 5;
    
    -- Only check if expires_at is set and status is active
    IF NEW.expires_at IS NOT NULL
       AND NEW.status = 'active'
       AND NEW.coach_id IS NOT NULL
       AND NEW.member_id IS NOT NULL THEN
        
        -- Calculate days until expiry
        SET days_until_expiry = DATEDIFF(NEW.expires_at, CURDATE());
        
        -- Notify at 7 days, 3 days, and 1 day before expiry (only once per threshold)
        -- This is informational for the coach, not a call to action
        IF (days_until_expiry = 7 OR days_until_expiry = 3 OR days_until_expiry = 1)
           AND days_until_expiry > 0
           AND (OLD.expires_at IS NULL OR DATEDIFF(OLD.expires_at, CURDATE()) != days_until_expiry) THEN
            
            -- Get member name
            SELECT CONCAT(COALESCE(fname, ''), ' ', COALESCE(lname, '')) INTO member_name_var
            FROM user
            WHERE id = NEW.member_id;
            
            -- Get notification status and type IDs
            SELECT id INTO unread_status_id FROM notification_status WHERE status_name = 'Unread' LIMIT 1;
            IF unread_status_id IS NULL THEN SET unread_status_id = 1; END IF;
            
            SELECT id INTO reminder_type_id FROM notification_type WHERE type_name = 'reminder' LIMIT 1;
            IF reminder_type_id IS NULL THEN SET reminder_type_id = 5; END IF;
            
            -- Create notification for coach (informational only)
            INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
            VALUES (
                NEW.coach_id,
                CONCAT(COALESCE(member_name_var, 'A member'), '''s personal coaching subscription expires in ', days_until_expiry, 
                       CASE 
                           WHEN days_until_expiry = 1 THEN ' day'
                           ELSE ' days'
                       END, '.'),
                unread_status_id,
                reminder_type_id,
                NOW()
            );
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_coach_member_disconnected` AFTER UPDATE ON `coach_member_list` FOR EACH ROW BEGIN
    DECLARE member_name_var VARCHAR(255);
    DECLARE unread_status_id INT DEFAULT 1;
    DECLARE warning_type_id INT DEFAULT 2;
    
    -- Notify when status changes to 'expired' or 'disconnected'
    IF (NEW.status = 'expired' OR NEW.status = 'disconnected')
       AND OLD.status != NEW.status
       AND OLD.status = 'active'
       AND NEW.coach_id IS NOT NULL
       AND NEW.member_id IS NOT NULL THEN
        
        -- Get member name
        SELECT CONCAT(COALESCE(fname, ''), ' ', COALESCE(lname, '')) INTO member_name_var
        FROM user
        WHERE id = NEW.member_id;
        
        -- Get notification status and type IDs
        SELECT id INTO unread_status_id FROM notification_status WHERE status_name = 'Unread' LIMIT 1;
        IF unread_status_id IS NULL THEN SET unread_status_id = 1; END IF;
        
        SELECT id INTO warning_type_id FROM notification_type WHERE type_name = 'warning' LIMIT 1;
        IF warning_type_id IS NULL THEN SET warning_type_id = 2; END IF;
        
        -- Create notification for coach
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.coach_id,
            CONCAT(COALESCE(member_name_var, 'A member'), '''s personal coaching has ', 
                   CASE 
                       WHEN NEW.status = 'expired' THEN 'expired'
                       WHEN NEW.status = 'disconnected' THEN 'been disconnected'
                       ELSE 'ended'
                   END, '.'),
            unread_status_id,
            warning_type_id,
            NOW()
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_coach_new_member_assigned` AFTER UPDATE ON `coach_member_list` FOR EACH ROW BEGIN
    DECLARE member_name_var VARCHAR(255);
    DECLARE unread_status_id INT DEFAULT 1;
    DECLARE success_type_id INT DEFAULT 3;
    
    -- Only trigger when:
    -- 1. Both coach_approval and staff_approval become 'approved'
    -- 2. Status becomes 'active'
    -- 3. This is a new assignment (OLD status was not 'active' or OLD approvals were not both 'approved')
    IF (NEW.coach_approval = 'approved' AND NEW.staff_approval = 'approved' AND NEW.status = 'active')
       AND (OLD.coach_approval != 'approved' OR OLD.staff_approval != 'approved' OR OLD.status != 'active')
       AND NEW.coach_id IS NOT NULL
       AND NEW.member_id IS NOT NULL THEN
        
        -- Get member name
        SELECT CONCAT(COALESCE(fname, ''), ' ', COALESCE(lname, '')) INTO member_name_var
        FROM user
        WHERE id = NEW.member_id;
        
        -- Get notification status and type IDs (with fallback)
        SELECT id INTO unread_status_id FROM notification_status WHERE status_name = 'Unread' LIMIT 1;
        IF unread_status_id IS NULL THEN SET unread_status_id = 1; END IF;
        
        SELECT id INTO success_type_id FROM notification_type WHERE type_name = 'success' LIMIT 1;
        IF success_type_id IS NULL THEN SET success_type_id = 3; END IF;
        
        -- Create notification for coach
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.coach_id,
            CONCAT(COALESCE(member_name_var, 'A new member'), ' has been assigned to you as a new member. You can now start creating programs and tracking their progress.'),
            unread_status_id,
            success_type_id,
            NOW()
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_coach_sessions_low` AFTER UPDATE ON `coach_member_list` FOR EACH ROW BEGIN
    DECLARE member_name_var VARCHAR(255);
    DECLARE unread_status_id INT DEFAULT 1;
    DECLARE warning_type_id INT DEFAULT 2;
    
    -- Notify when remaining_sessions drops to 3 or less (and was higher before)
    IF NEW.remaining_sessions IS NOT NULL
       AND NEW.remaining_sessions <= 3
       AND (OLD.remaining_sessions IS NULL OR OLD.remaining_sessions > 3)
       AND NEW.status = 'active'
       AND NEW.coach_id IS NOT NULL
       AND NEW.member_id IS NOT NULL THEN
        
        -- Get member name
        SELECT CONCAT(COALESCE(fname, ''), ' ', COALESCE(lname, '')) INTO member_name_var
        FROM user
        WHERE id = NEW.member_id;
        
        -- Get notification status and type IDs
        SELECT id INTO unread_status_id FROM notification_status WHERE status_name = 'Unread' LIMIT 1;
        IF unread_status_id IS NULL THEN SET unread_status_id = 1; END IF;
        
        SELECT id INTO warning_type_id FROM notification_type WHERE type_name = 'warning' LIMIT 1;
        IF warning_type_id IS NULL THEN SET warning_type_id = 2; END IF;
        
        -- Create notification for coach
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.coach_id,
            CONCAT(COALESCE(member_name_var, 'A member'), ' has only ', NEW.remaining_sessions, 
                   CASE 
                       WHEN NEW.remaining_sessions = 1 THEN ' session'
                       ELSE ' sessions'
                   END, ' remaining. Consider reaching out about renewal.'),
            unread_status_id,
            warning_type_id,
            NOW()
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `set_monthly_sessions` BEFORE INSERT ON `coach_member_list` FOR EACH ROW BEGIN
    IF NEW.rate_type = 'monthly' THEN
        SET NEW.remaining_sessions = 18;
        SET NEW.expires_at = DATE_ADD(CURDATE(), INTERVAL 1 MONTH);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `coach_review`
--

CREATE TABLE `coach_review` (
  `id` int(11) NOT NULL,
  `coach_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `feedback` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `coach_review`
--

INSERT INTO `coach_review` (`id`, `coach_id`, `member_id`, `rating`, `feedback`, `created_at`) VALUES
(5, 3, 4, 3, 'great coach! but there is something missing...', '2025-11-26 03:24:48'),
(6, 3, 11, 3, 'na inspire ko ni coach mag steroids', '2026-01-31 05:26:45');

--
-- Triggers `coach_review`
--
DELIMITER $$
CREATE TRIGGER `notify_coach_new_review` AFTER INSERT ON `coach_review` FOR EACH ROW BEGIN
    DECLARE member_name_var VARCHAR(255);
    DECLARE unread_status_id INT DEFAULT 1;
    DECLARE achievement_type_id INT DEFAULT 6;
    DECLARE feedback_text VARCHAR(255);
    
    -- Get member name
    SELECT CONCAT(COALESCE(fname, ''), ' ', COALESCE(lname, '')) INTO member_name_var
    FROM user
    WHERE id = NEW.member_id;
    
    -- Clean feedback text - remove ALL emojis and special characters
    SET feedback_text = '';
    IF NEW.feedback IS NOT NULL AND NEW.feedback != '' THEN
        -- Remove all emojis and question marks - comprehensive removal
        SET feedback_text = NEW.feedback;
        -- Remove question marks first
        SET feedback_text = REPLACE(REPLACE(feedback_text, '?', ''), '？', '');
        -- Remove common emojis (star, fire, thumbs up, etc.)
        SET feedback_text = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            feedback_text,
            '⭐', ''), '?', ''), '✨', ''), '?', ''), '?', ''), '?', ''), '?', ''), '?', ''), '❤️', ''), '?', ''), '?', ''), '?', ''), '?', ''), '?', ''), '?', '');
        -- Trim and limit length
        SET feedback_text = TRIM(LEFT(feedback_text, 100));
    END IF;
    
    -- Get notification status and type IDs
    SELECT id INTO unread_status_id FROM notification_status WHERE status_name = 'Unread' LIMIT 1;
    IF unread_status_id IS NULL THEN SET unread_status_id = 1; END IF;
    
    SELECT id INTO achievement_type_id FROM notification_type WHERE type_name = 'achievement' LIMIT 1;
    IF achievement_type_id IS NULL THEN SET achievement_type_id = 6; END IF;
    
    -- Create notification for coach
    INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
    VALUES (
        NEW.coach_id,
        CONCAT(COALESCE(member_name_var, 'A member'), ' left you a ', NEW.rating, '-star review', 
               CASE 
                   WHEN feedback_text != '' THEN CONCAT(': ', feedback_text)
                   ELSE ''
               END),
        unread_status_id,
        achievement_type_id,
        NOW()
    );
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `coach_sales`
--

CREATE TABLE `coach_sales` (
  `sale_id` int(11) NOT NULL,
  `coach_user_id` int(11) NOT NULL,
  `item` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `sale_date` datetime DEFAULT NULL,
  `rate_type` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coach_session_usage`
--

CREATE TABLE `coach_session_usage` (
  `id` int(11) NOT NULL,
  `coach_member_id` int(11) NOT NULL COMMENT 'Reference to coach_member_list.id',
  `usage_date` date NOT NULL COMMENT 'Date when session was used',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Tracks daily session usage for coach packages';

--
-- Dumping data for table `coach_session_usage`
--

INSERT INTO `coach_session_usage` (`id`, `coach_member_id`, `usage_date`, `created_at`) VALUES
(12, 4, '2025-11-26', '2025-11-26 05:53:19');

-- --------------------------------------------------------

--
-- Table structure for table `conversations`
--

CREATE TABLE `conversations` (
  `id` int(11) NOT NULL,
  `participant1_id` int(11) NOT NULL,
  `participant2_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `conversations`
--

INSERT INTO `conversations` (`id`, `participant1_id`, `participant2_id`, `created_at`) VALUES
(36, 3, 4, '2025-11-26 03:30:23'),
(37, 3, 11, '2025-11-26 05:49:34');

-- --------------------------------------------------------

--
-- Table structure for table `email_verification_tokens`
--

CREATE TABLE `email_verification_tokens` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `token` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `email_verification_tokens`
--

INSERT INTO `email_verification_tokens` (`id`, `email`, `user_name`, `token`, `expires_at`, `used`, `created_at`) VALUES
(1, 'Kentxavierycruz@ustp.edu.ph', 'Kent Xaviery Cruz', '013548', '2025-10-07 10:59:54', 0, '2025-10-07 10:49:55'),
(2, 'rjlouisetan@gmail.com', 'Rj Louise Tan', '677197', '2025-10-07 11:05:05', 0, '2025-10-07 10:55:05'),
(3, 'uyguangco.francisbaron@gmail.com', 'Francis baron Uyguangco', '175823', '2025-10-07 11:08:15', 1, '2025-10-07 10:58:15'),
(4, 'khomarlon58@gmail.com', 'marlon kho', '062170', '2025-10-08 02:39:00', 1, '2025-10-08 02:29:00'),
(5, 'princessjayabbey@gmail.com', 'jhon lowen son Tamayo', '086374', '2025-10-11 08:07:12', 1, '2025-10-11 07:57:12'),
(6, 'rjaylouisetan@gmail.com', 'James Luke', '116658', '2025-10-14 07:07:02', 1, '2025-10-14 06:57:02'),
(8, 'covillapez17@gmail.com', 'julieto villapez', '506858', '2025-10-14 07:30:29', 1, '2025-10-14 07:20:29'),
(9, 'earlmedequiso@gmail.com', 'Earl Karl', '612726', '2025-10-15 14:05:18', 1, '2025-10-15 13:55:18'),
(12, 'jeor.galarosa.coc@phinmaed.com', 'Jerry Galarosa', '946318', '2025-10-17 06:37:48', 0, '2025-10-17 06:27:48'),
(16, 'jerrygalarosa680@gmail.com', 'Jerry Galarosa', '698209', '2025-10-17 06:44:45', 1, '2025-10-17 06:34:45');

-- --------------------------------------------------------

--
-- Table structure for table `exercise`
--

CREATE TABLE `exercise` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `benefits` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `video_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `exercise`
--

INSERT INTO `exercise` (`id`, `name`, `description`, `instructions`, `benefits`, `image_url`, `video_url`) VALUES
(14, 'Barbel Bench Press', 'The barbell bench press is a compound upper-body exercise that primarily targets the chest while also engaging the shoulders and triceps. It is one of the most effective movements for building pushing strength and overall upper-body mass.', '1. Lie flat on a bench with your feet firmly on the floor.\n\n2. Grip the barbell slightly wider than shoulder-width apart (palms facing forward).\n\n3. Unrack the bar and hold it directly above your chest with straight arms.\n\n4. Inhale and slowly lower the barbell to your mid-chest, keeping elbows at about a 45Â° angle.\n\n5. Pause briefly at the bottom for control.\n\n6. Exhale and press the barbell upward until your arms are fully extended.\n\n7. Repeat for the desired number of reps, maintaining proper form.\n\n8. After finishing your set, carefully re-rack the bar.', 'Chest Development â†’ Targets the Pectoralis Major (Sternal & Clavicular heads) for size and strength.\n\nTriceps Strength â†’ Engages the Triceps Brachii (Long, Lateral, Medial heads) to improve pressing power.\n\nShoulder Stability â†’ Works the Anterior Deltoid and Rotator Cuff muscles to stabilize the bar path.\n\nCore Engagement â†’ Activates Rectus Abdominis, Obliques, and Erector Spinae for stabilization.\n\nUpper Body Power â†’ One of the best compound lifts for overall pushing strength, useful in sports and daily activities.', 'https://api.cnergy.site/image-servers.php?image=690efcce1bae9_1762589902.png', 'http://localhost/cynergy/uploads/687f4af7bc256_1753172727.mp4'),
(15, 'Incline Dumbbell Press', 'The Incline Dumbbell Press is a strength training exercise that targets the upper portion of the chest. Performed on an incline bench (typically set at 30–45 degrees), this variation emphasizes the clavicular head of the pectoralis major, while also engaging the shoulders and triceps. Using dumbbells instead of a barbell allows for a greater range of motion, improved muscle activation, and balanced strength development on both sides of the body.', '1. Setup\n Adjust a bench to a 30–45° incline. Sit down with a dumbbell in each hand resting on your thighs. lie back on the bench and position the dumbbells at shoulder level, palms facing forward.\n\n2. Execution\n- Press the dumbbells upward until your arms are fully extended but not locked out.\n - Slowly lower the dumbbells down in a controlled motion to  just above chest level.\n - Keep elbows slightly tucked (about 45° angle to your torso) to protect the shoulders.\n\n3. Breathing\n- Inhale as you lower the dumbbells.\n   Exhale as you press the dumbbells upward.\n\n4. Form Tips\n- Avoid arching your lower back excessively.\n- Keep your feet flat on the floor for stability.\n- Maintain controlled movements — no bouncing or dropping the dumbbells.', 'Builds upper chest development for a fuller, more balanced chest.\n\nIncreases shoulder stability and triceps strength.\n\nEnhances range of motion compared to barbell presses.\n\nHelps correct strength imbalances between the left and right side.\n\nImproves aesthetic shape of the chest, creating a lifted and fuller upper pec appearance.', 'https://api.cnergy.site/image-servers.php?image=6924a63693919_1764009526.jfif', 'https://api.cnergy.site/image-servers.php?image=68ff92311896e_1761579569.mp4'),
(16, 'Chest Fly Machine', 'The Hip Thrust is a lower-body strength exercise that primarily targets the gluteal muscles. It involves driving the hips upward against resistance (typically a barbell, dumbbell, or machine pad) while the upper back is supported on a bench. This exercise places the glutes under significant tension at the top of hip extension, making it one of the most effective moves for building glute strength, size, and power', '1. Setup\n\n- Sit on the floor with your upper back against a bench.\n\n- Roll a barbell over your hips (use a pad for comfort).\n\n- Bend your knees to about 90°, feet flat on the floor shoulder-width apart.\n\n2. Execution\n\n- Brace your core and keep your chin tucked.\n\n- Drive through your heels to extend your hips upward.\n\n- Squeeze your glutes hard at the top until your torso and thighs are parallel to the ground.\n\n- Slowly lower the barbell back down with control.\n\n3. Breathing\n\n- Exhale as you thrust upward.\n\n- Inhale as you lower down.\n\n- Form Tips\n\n- Keep your ribs tucked and avoid over-arching your lower back.\n\n- Push through your heels, not your toes.\n\n- Pause briefly at the top for max glute contraction.', '-Builds stronger, bigger glutes (primary muscle for hip extension).\n- Improves athletic performance (running, jumping, sprinting, explosive power).\n\n- Enhances lower-body aesthetics by shaping glutes and hamstrings.\n\n- Strengthens hip stability, reducing risk of injuries.\n\n- Transfers to stronger squats and deadlifts.', 'https://api.cnergy.site/image-servers.php?image=6925d6b57832b_1764087477.jpg', 'https://api.cnergy.site/image-servers.php?image=69249d6ddb009_1764007277.mp4'),
(17, 'Cable Crossover', 'The Cable Crossover is an isolation exercise that primarily targets the pectoralis major (chest) using a cable machine. Unlike dumbbell or barbell chest exercises, the cable crossover provides constant tension throughout the entire range of motion, which helps maximize chest contraction and definition. By adjusting the pulley height (high, mid, or low), you can emphasize different portions of the chest.', '1. Setup\n- Set the pulleys on both sides of a cable machine to shoulder height (for mid-crossovers).\n- Grab a handle in each hand with a neutral grip (palms facing downward/inward).\n- Step forward into a staggered stance, leaning slightly forward at the hips.\n- Keep a light bend in the elbows throughout the movement.\n\n2. Execution\n- Begin with arms extended out to your sides (like a wide “T” position)\n- Bring the handles forward in a wide arc until your hands meet in front of your chest.\n- Squeeze your chest muscles at the end of the movement.\n- Slowly return to the starting position, resisting the pull of the cables.\n\n3. Breathing\n- Exhale as you bring the cables together.\n- Inhale as you return to the starting position.\n\n4. Form Tips\n- Keep your elbows slightly bent (do not lock).\n- Avoid leaning too far forward or arching your back.=\n- Focus on controlled motion—do not let the weights snap back.', '- Builds chest size and definition with constant tension.\n- Allows targeting of specific chest regions (upper, middle, lower) by adjusting pulley height.\n- Improves mind-muscle connection with the pectorals.\n- Enhances muscular symmetry since both arms work independently.\n- Provides a safer alternative for chest isolation compared to heavy pressing movements.', 'https://api.cnergy.site/image-servers.php?image=69249b369a007_1764006710.jpg', 'https://api.cnergy.site/image-servers.php?image=69249b39795a9_1764006713.mp4'),
(18, 'Seated Chest Press Machine', 'The Seated Chest Press Machine is a machine-based pushing exercise designed to target the pectoralis major (chest muscles). It mimics the motion of a traditional bench press but provides guided stability through the machine’s fixed path, making it safer and more beginner-friendly. It’s an effective way to build chest, shoulder, and triceps strength with reduced risk of losing balance or using improper form.', '1. Sit on the chest press machine with your back flat against the pad and feet firmly on the ground.\n\n2. Adjust the seat height so that the handles are level with the middle of your chest.\n\n3. Grasp the handles with an overhand grip (palms facing downward/forward).\n\n4. Brace your core, keep your chest up, and retract your shoulder blades slightly.\n\n5. Push the handles forward and extend your arms until they are just short of lockout.\n\n6. Pause briefly at the top, squeezing your chest.\n\n7. Slowly return the handles back to the starting position under control.\n\n8. Repeat for the desired reps.', 'Chest Development ? Builds mass and strength in the pectorals.\n\nGuided Stability ? Machine support reduces injury risk compared to free weights.\n\nBeginner-Friendly ? Easier to learn and safer for those new to pressing movements.\n\nProgressive Overload ? Allows controlled, heavy lifting without a spotter.\n\nJoint-Friendly ? Reduces strain on shoulders compared to free-weight bench press.\n\nIsolation Focus ? Helps keep tension on chest without excessive stabilizer involvement.', 'https://api.cnergy.site/image-servers.php?image=69266a2a777e1_1764125226.jpg', ''),
(19, 'Barbell squat', 'A fundamental compound exercise that builds lower-body strength and size by squatting with a barbell across your back or front, engaging multiple major muscle groups.', '1. Stand with feet shoulder-width apart, barbell resting securely on your upper traps (back squat) or across the front shoulders (front squat).\n\n2. Keep your chest up, core tight, and back straight.\n\n3. Bend at the hips and knees to lower into a squat until thighs are at least parallel to the floor.\n\n4. Press through your heels to return to a standing position, fully extending hips and knees.\n\n5. Repeat for the desired reps while maintaining controlled movement.', 'Builds overall lower-body strength and mass.\n\nImproves core stability and posture.\n\nEnhances athletic performance (power, speed, explosiveness).\n\nStrengthens joints, tendons, and bone density.', 'https://api.cnergy.site/image-servers.php?image=69249488ec10e_1764005000.jfif', 'https://api.cnergy.site/image-servers.php?image=68ff943c712bb_1761580092.mp4'),
(20, 'Leg Press', 'The Leg Press is a machine-based lower-body compound exercise that involves pushing a weighted platform away from the body using the legs. It mimics the squatting motion but provides more stability and support. The exercise is great for targeting the quadriceps, glutes, and hamstrings, and it allows for heavy loading while reducing stress on the lower back compared to free-weight squats.', 'Sit down on the leg press machine with your back and head supported against the pad.\n\nPlace your feet shoulder-width apart on the platform (toes slightly angled out if comfortable).\n\nGrip the side handles for stability.\n\nRelease the safety handles or locks carefully.\n\nLower the platform by bending your knees to about 90° (or slightly deeper if mobility allows).\n\nKeep knees aligned with your toes (avoid inward collapse).\n\nPush the platform back up by extending your legs until they’re nearly straight (don’t lock out completely).\n\nRepeat for the desired number of reps, then re-engage the safety locks before leaving the machine.', '', 'https://api.cnergy.site/image-servers.php?image=6925dd576f5d4_1764089175.jpg', ''),
(21, 'Smith Machine Squat', 'The Smith Machine Squat is a compound lower-body exercise performed on a Smith machine, where the barbell is fixed on vertical rails. This setup allows for a more controlled range of motion compared to a free-weight squat, making it safer for beginners or those training without a spotter. It primarily targets the quadriceps, glutes, and hamstrings, while also engaging stabilizing muscles. Depending on foot placement (forward vs under hips), you can emphasize different muscle groups.', '1. Position the Smith machine bar across your upper traps (not on your neck).\n\n2. Stand with feet about shoulder-width apart, toes slightly pointed outward.\n\n3. Unlock the bar by rotating it and brace your core.\n\n4. Begin lowering yourself by bending your knees and hips, keeping chest upright.\n\n5. Descend until thighs are at least parallel to the floor (or slightly below, depending on mobility).\n\n6. Push through your heels to extend your legs and return to the starting position.\n\n7. Repeat for the desired reps, then re-rack the bar by rotating it back into the locks.', 'Quad & Glute Strength ? Builds lower body strength and hypertrophy.\n\nStability & Safety ? Bar path is fixed, reducing balance demands and risk of falling.\n\nBeginner-Friendly ? Easier to learn compared to free barbell squats.\n\nVersatility ? Adjustable foot positioning can shift emphasis (quads vs glutes).\n\nProgressive Overload ? Allows controlled, heavy lifting without a spotter.\n\nRehabilitation Use ? Good for those easing back into squats with support.', 'https://api.cnergy.site/image-servers.php?image=6925deb86ee53_1764089528.jpg', ''),
(22, 'Bulgarian Split Squat', 'A unilateral lower-body exercise where one foot is elevated behind you while squatting on the front leg, improving leg strength, balance, and stability.', '1. Stand a few feet in front of a bench (or elevated surface).\n\n2. Place the top of one foot on the bench behind you, keeping the other leg firmly planted on the floor.\n\n3. keep your torso upright, core braced, and chest lifted.\n\n4. Lower your body by bending the front knee until your thigh is parallel to the ground.\n\n5. Push through your front heel to return to the starting position.\n\n6. Repeat for desired reps, then switch legs.', 'Builds unilateral strength and corrects imbalances between legs.\n\nIncreases quad, glute, and hamstring development.\n\nImproves balance, coordination, and hip mobility.\n\nReduces stress on the lower back compared to traditional squats.', 'https://api.cnergy.site/image-servers.php?image=6924992465c61_1764006180.jpg', 'https://api.cnergy.site/image-servers.php?image=692499266ba44_1764006182.mp4'),
(23, 'Lat Pulldown', 'The lat pulldown is a machine-based pulling exercise that builds a wide, strong back by targeting the lats and supporting muscles. It also enhances pulling strength and improves posture.', '1. Sit on the lat pulldown machine and adjust the thigh pad to secure your legs.\n\n2. Grip the bar slightly wider than shoulder-width with palms facing forward.\n\n3. Start with arms fully extended overhead.\n\n4. Inhale and pull the bar down toward your upper chest, squeezing your shoulder blades together.\n\n5. Pause briefly, then slowly return the bar to the starting position under control.\n\n6. Repeat for the desired reps.', 'Primary Back Builder â†’ Targets the Latissimus Dorsi for width and strength.\n\nSecondary Activation â†’ Works the Biceps (Long & Short Head), Brachialis, Rhomboids, Posterior Deltoid, Teres Major.\n\nStabilization â†’ Engages the Trapezius, Teres Minor, Infraspinatus, and Core for posture and control.\n\nPostural Improvement â†’ Strengthens the upper back, improving shoulder stability and spinal alignment.', 'https://api.cnergy.site/image-servers.php?image=6925d5d6db361_1764087254.jpg', 'https://api.cnergy.site/image-servers.php?image=68ff93ebaef0f_1761580011.mp4'),
(24, 'Seated Cable Row', 'The Seated Cable Row is a machine-based pulling exercise that primarily targets the back muscles, especially the latissimus dorsi, rhomboids, and trapezius. It involves pulling a cable handle toward your torso while seated, which mimics the rowing motion. This exercise builds a strong, thick back, improves posture, and develops pulling strength for both athletic performance and daily activities.', '1. Sit on the cable row machine with your feet securely placed on the foot platform and knees slightly bent.\n\n2. Grab the handle (V-bar, straight bar, or rope) with both hands.\n\n3. Sit upright with your chest up, shoulders back, and core engaged.\n\n4. Begin the movement by pulling the handle toward your midsection (around the waist or lower chest) while keeping elbows close to your body.\n\n5. Focus on pulling with your back, not just your arms.\n\n6. Squeeze your shoulder blades together at the end of the pull.\n\n7. Slowly extend your arms forward to return to the starting position with control.\n\n8. Repeat for the desired reps.', 'Back Thickness & Strength ? Develops middle back muscles for a denser, stronger back.\n\nImproved Posture ? Strengthens muscles that pull the shoulders back, reducing slouching.\n\nBalanced Development ? Complements vertical pulls (like pull-ups) with horizontal pulling.\n\nArm Strength ? Engages biceps and forearms as secondary movers.\n\nSpinal Stability ? Builds midline support and core activation during pulling.\n\nVersatility ? Multiple grip options target different parts of the back.', 'https://api.cnergy.site/image-servers.php?image=6925d65f94c36_1764087391.jpg', 'https://api.cnergy.site/image-servers.php?image=68ff947534b50_1761580149.mp4'),
(25, 'T-Bar Row', 'The T-Bar Row is a compound pulling exercise that targets the middle and upper back muscles. Performed using a T-Bar row machine or a barbell in a landmine setup, the movement involves pulling a weighted bar toward your torso while keeping the torso inclined. It’s a strength-building and muscle-building exercise that emphasizes thickness of the back, improving posture, and enhancing pulling power.', '1. Position yourself with feet shoulder-width apart on the T-Bar row platform (or straddle the bar if using a landmine setup).\n\n2. Bend at the hips and knees slightly, keeping your back flat and chest up.\n\n3. Grab the handles (V-grip or wide grip depending on the attachment).\n\n4. Start with arms fully extended and shoulders stretched forward.\n\n5. Pull the bar toward your midsection (upper abdomen or lower chest).\n\n6. Squeeze your shoulder blades together at the top of the movement.\n\n7. Lower the weight under control back to the starting position.\n\n8. Rpeat for the desired reps.', 'Back Thickness & Strength ? Builds dense musculature in the lats, rhomboids, and traps.\n\nPosture Improvement ? Strengthens postural muscles for upright alignment.\n\nPulling Power ? Improves strength for deadlifts, pull-ups, and rows.\n\nCore Engagement ? Demands stabilization through the lower back and abs.\n\nMuscle Balance ? Counteracts pressing-dominant routines (chest/shoulder work).', 'https://api.cnergy.site/image-servers.php?image=69266b6b9dc42_1764125547.png', ''),
(26, 'Lateral Raise', 'The Lateral Raise is an isolation exercise that primarily targets the lateral (middle) deltoids, giving the shoulders a wider, more defined appearance. It involves raising the arms out to the sides in a controlled motion, typically with dumbbells, cables, or resistance bands. The movement emphasizes shoulder abduction while minimizing assistance from other muscles.', '1. Stand upright with feet shoulder-width apart, holding a dumbbell in each hand at your sides with palms facing inward.\n\n2. Keep a slight bend in your elbows (not locked) to protect the joints.\n\n3. Brace your core and keep your chest up.\n\n4. Lift your arms out to the sides until they are parallel to the floor (shoulder height).\n\n5. Elbows should lead the movement, not the hands.\n\n6. Pause briefly at the top, squeezing the delts.\n\n7. Slowly lower the weights back to the starting position under control.\n\n8.Repeat for the desired reps.', 'Shoulder Width & Aesthetics ? Builds broader, more rounded shoulders.\n\nIsolation of Delts ? Directly targets the lateral deltoid, unlike compound presses.\n\nImproved Shoulder Strength ? Strengthens stabilizers important for presses and overhead lifts.\n\nJoint Health ? Helps balance shoulder development, reducing risk of imbalances and injuries.\n\nFunctional Strength ? Supports movements involving lifting objects to the side.', 'https://api.cnergy.site/image-servers.php?image=6925e457813c7_1764090967.jpg', 'https://api.cnergy.site/image-servers.php?image=68ff93a7a3af6_1761579943.mp4'),
(27, 'Rear Delt Fly', 'The Rear Delt Fly (also called Reverse Fly) is an isolation exercise that targets the rear deltoid muscles of the shoulders. It involves extending the arms out to the sides in a reverse fly motion, typically using dumbbells, cables, or a machine. This exercise strengthens the posterior deltoids, upper back muscles, and improves shoulder stability and posture.', '1. Setup\n\nHold a dumbbell in each hand (or use cables/machine).\n\nBend forward at the hips (torso almost parallel to the floor), keeping a neutral spine.\n\nLet your arms hang down below you with a slight bend at the elbows, palms facing each other.\n\n2. Execution\n\nWith controlled motion, raise your arms out to the sides until they are at shoulder height.\n\nFocus on squeezing your rear delts and upper back at the top.\n\nSlowly lower the weights back down to the starting position.\n\n3. Breathing\n\nExhale as you raise your arms.\n\nInhale as you lower them back down.\n\n4. Form Tips\n\nAvoid swinging or using momentum.\n\nDo not shrug your shoulders (trap dominance).\n\nKeep the movement slow and controlled to isolate the rear delts.', 'Builds rear deltoid strength for balanced shoulder development.\n\nImproves posture by strengthening upper back muscles.\n\nEnhances shoulder stability, reducing injury risk.\n\nHelps correct muscle imbalances (since front delts often dominate).\n\nImproves aesthetics by creating wider, 3D-looking shoulders.', 'https://api.cnergy.site/image-servers.php?image=69266b2ab4d54_1764125482.png', ''),
(28, 'Barbell Curl', 'A fundamental biceps exercise that uses a barbell to build arm strength and size by isolating the biceps through elbow flexion.', '1. Stand upright holding a barbell with an underhand grip (palms facing forward), hands shoulder-width apart.\n\n2. Keep your elbows close to your torso and your back straight.\n\n3. Curl the barbell upward by contracting your biceps, without swinging your body.\n\n4. Slowly lower the barbell back down to the starting position under control.\n\n5. Repeat for the desired reps.', 'Builds biceps size and peak.\n\nImproves arm strength and pulling power.\n\nEnhances grip and forearm activation.', 'https://api.cnergy.site/image-servers.php?image=69247e9ddbab1_1763999389.jpeg', 'https://api.cnergy.site/image-servers.php?image=692493b3746f5_1764004787.mp4'),
(29, 'Cable Bicep Curl', 'The Cable Bicep Curl is an isolation exercise performed on a cable machine to target the biceps brachii. Unlike free-weight curls, the cable provides constant resistance throughout the entire movement, which keeps tension on the biceps during both the concentric (lifting) and eccentric (lowering) phases. It’s excellent for building size, strength, and definition in the arms while improving control and stability.', '1. Setup\n- Attach a straight bar, EZ bar, or rope to the low pulley of a cable machine.\n- Stand upright facing the machine, feet shoulder-width apart.\n- Grip the handle with an underhand (supinated) grip, arms fully extended, elbows tucked at your sides.\n\n2. Execution\n- Curl the attachment upward by contracting your biceps.\n- Keep elbows pinned close to your torso, moving only your forearms.\n- Continue curling until your forearms are nearly vertical, squeezing your biceps at the top.\n- Lower the attachment slowly under control back to the starting position.\n\n3. Breathing\n- Exhale as you curl the weight up.\n- Inhale as you return the weight down.\n\n4. Form Tips\n- Do not swing your torso or use momentum.\n- Keep your wrists neutral and steady (avoid bending them back).\n- Focus on slow and controlled reps for maximum tension.', '- Builds biceps peak, thickness, and definition.\n\n- Provides constant tension for better muscle activation.\n\n- Improves mind-muscle connection and control.\n\n- Strengthens arm and grip stability.\n\n- Reduces reliance on momentum compared to dumbbell/barbell curls.', 'https://api.cnergy.site/image-servers.php?image=6925c173217b4_1764082035.jpg', 'https://api.cnergy.site/image-servers.php?image=69249a0a4c880_1764006410.mp4'),
(30, 'Triceps Dip', 'The Triceps Dip is a compound bodyweight pushing exercise that primarily targets the triceps brachii, while also engaging the chest and shoulders. It can be performed on parallel dip bars, assisted dip machines, or even using a bench. Dips are an excellent exercise for building upper body pushing strength, arm size, and improving lockout power for pressing movements.', '1. Grip the parallel bars and support yourself with arms locked out.\n\n2. Keep your chest upright or slightly leaned forward depending on focus.\n\n3. Upright ? more triceps focus\n\n4. Forward lean ? more chest focus\n\n5. Slowly bend your elbows and lower your body until your upper arms are about parallel to the floor.\n\n6. Keep elbows tucked in close to your torso (not flaring out wide).\n\n7. Push yourself back up by straightening your arms until fully extended.\n\n8. Repeat for the desired reps.', 'Triceps Hypertrophy & Strength ? Builds thick, strong arms.\n\nUpper Body Power ? Improves pressing strength for bench press, overhead press, etc.\n\nFunctional Strength ? Uses bodyweight, promoting real-world pushing ability.\n\nScalable Exercise ? Can be made easier (assisted dip machine) or harder (add weight belt).\n\nMinimal Equipment ? Only requires parallel bars or a sturdy bench.', 'https://api.cnergy.site/image-servers.php?image=69266b9c603e5_1764125596.png', ''),
(32, 'Deadlift', 'The deadlift is a full-body compound lift that builds strength and power by training the posterior chain â€” glutes, hamstrings, lower back â€” while also engaging the core and upper back for stability.', '1.Stand with your mid-foot under the barbell, feet about hip-width apart.\n\n2. Bend at the hips and knees to grip the bar just outside your knees (palms facing you or mixed grip).\n\n3. Keep your chest up, back straight, and core tight.\n\n4. Inhale, brace, and push through your heels to lift the bar, extending hips and knees at the same time.\n\n5. Stand tall at the top, locking your hips and knees.\n\n6. Exhale and return the bar to the ground by hinging at the hips first, then bending your knees.\n\n7. Repeat with controlled reps.', 'Posterior Chain Strength â†’ Develops glutes, hamstrings, and spinal erectors for raw power.\n\nCore Stability â†’ Strengthens abs, obliques, and transverse abdominis, protecting the spine.\n\nGrip & Upper Back â†’ Builds forearms, traps, and lats for improved pulling strength.\n\nFunctional Carryover â†’ Enhances performance in sports and everyday activities like lifting heavy objects safely.', 'https://api.cnergy.site/image-servers.php?image=6925d532a344c_1764087090.jpg', 'http://localhost/cynergy/image-servers.php?image=68ad497608dbc_1756186998.mp4'),
(33, 'Romanian Deadlift', 'The Romanian Deadlift (RDL) is a hip-hinge strength exercise that primarily targets the posterior chain—especially the hamstrings, glutes, and lower back. Unlike the conventional deadlift, the RDL emphasizes the eccentric (lowering) phase, focusing on stretching the hamstrings while maintaining a slight bend in the knees. It is highly effective for developing hip extension power, hamstring strength, and overall posterior chain stability.', '1. Stand upright holding a barbell (or dumbbells) in front of your thighs with an overhand grip, feet hip-width apart.\n\n2. Keep your chest tall, shoulders back, and core braced.\n\n3. Begin the movement by pushing your hips back (hip hinge), keeping a slight bend in the knees.\n\n4. Lower the barbell slowly along the front of your thighs until you feel a deep stretch in your hamstrings (bar should go to mid-shin or just below knees, depending on flexibility).\n\n5. Keep your back flat and neck neutral throughout—avoid rounding.\n\n6. Drive your hips forward to return to the standing position, squeezing your glutes at the top.\n\n7. Repeat for the desired reps.', 'Hamstring Strength & Hypertrophy ? One of the best movements for targeting hamstrings through their lengthened position.\n\nGlute Development ? Builds powerful hip extension strength.\n\nPosterior Chain Strength ? Improves overall back, hamstrings, and glute endurance.\n\nAthletic Performance ? Enhances sprinting, jumping, and explosive hip-driven movements.\n\nPosture & Injury Prevention ? Strengthens spinal stabilizers, reducing risk of lower back and hamstring injuries.\n\nFunctional Strength ? Trains hip hinge mechanics essential for safe lifting in daily life.', 'https://api.cnergy.site/image-servers.php?image=6925ddc891e0b_1764089288.jpg', ''),
(34, 'Leg Curl', 'The Leg Curl (also called Hamstring Curl) is an isolation exercise that targets the hamstrings. It involves bending the knee against resistance, typically performed on a machine (lying, seated, or standing). The movement mimics the hamstrings’ natural role of knee flexion, making it a staple for lower-body strength, muscle balance, and athletic performance.', '1. Setup\n\n- Lie face down on a leg curl machine, positioning the back of your ankles under the padded lever.\n\n- Grip the handles or bench sides for stability.\n\n- Keep hips and torso pressed firmly against the bench.\n\n2. Execution\n\n- Exhale as you curl your legs upward, bringing your heels toward your glutes.\n\n- Squeeze your hamstrings at the top of the movement.\n\n- Inhale as you slowly return the weight back to the starting position.\n\n3. Form Tips\n\n- Move in a controlled manner—avoid swinging the weight.\n\n- Do not lift your hips off the bench (common mistake).\n\n- Focus on feeling the hamstrings contract.', '- Isolates and strengthens the hamstrings.\n\n- Improves muscle balance between quads and hamstrings, lowering injury risk.\n\n- Enhances knee joint stability by training hamstring role in knee flexion.\n\n- Improves athletic performance in sprinting, jumping, and explosive movements.\n\n- Supports posterior chain development for balanced leg aesthetics.', 'https://api.cnergy.site/image-servers.php?image=6925dc915a28b_1764088977.jpg', ''),
(35, 'Hip Thrust', 'The Hip Thrust is a lower-body strength exercise that primarily targets the gluteal muscles. It involves extending the hips upward while the upper back is supported on a bench and the feet are planted firmly on the ground. A barbell, dumbbell, or body weight can be used for resistance. It’s one of the most effective exercises for building glute strength, size, and power while also engaging the hamstrings and core.', '1. Sit on the ground with your upper back resting against a bench or sturdy surface.\n\n2. Roll a loaded barbell (or place a dumbbell/weight plate) over your hips. Use a pad for comfort.\n\n3. Bend your knees so your feet are flat on the floor, about shoulder-width apart, shins vertical.\n\n4. Brace your core and keep your chin tucked slightly.\n\n5. Drive through your heels and lift your hips upward until they align with your shoulders and knees.\n\n6. Pause briefly at the top, squeezing your glutes hard.\n\n7. Slowly lower your hips back down under control.\n\n8. Repeat for the desired reps.', 'Glute Development ? Builds strength and hypertrophy in the gluteus maximus.\n\nAthletic Performance ? Improves hip extension power for sprinting, jumping, and explosive movements.\n\nPosture & Stability ? Strengthens posterior chain, helping balance anterior-posterior muscle development.\n\nInjury Prevention ? Reinforces hip and pelvic stability, reducing risk of lower back and knee injuries.\n\nVersatility ? Can be done with bodyweight (beginner) or heavy barbell (advanced).', 'https://api.cnergy.site/image-servers.php?image=6925dbb8841e4_1764088760.jpg', ''),
(36, 'Glute Bridge', '', '', '', 'https://api.cnergy.site/image-servers.php?image=6925db103d2d3_1764088592.jpg', 'https://api.cnergy.site/image-servers.php?image=6924a3f7b86cd_1764008951.mp4'),
(37, 'Standing Calf Raise', 'The Standing Calf Raise is a calf isolation exercise that primarily targets the gastrocnemius muscle (the larger, outer calf). It involves lifting your heels upward while keeping your knees straight, emphasizing ankle plantar flexion. This exercise can be performed on a standing calf raise machine, with free weights (barbell/dumbbells), or bodyweight. It’s ideal for building calf size, strength, and ankle stability.', '1. Stand on the calf raise machine platform with the balls of your feet on the edge and heels hanging off.\n\n2. Position your shoulders under the pads (or hold dumbbells/barbell if done free-weight).\n\n3. Keep knees straight (slight unlock but no bend).\n\n4. Lower your heels slowly toward the floor to feel a deep calf stretch.\n\n5. Push through the balls of your feet to raise your heels as high as possible.\n\n6. Pause briefly at the top, squeezing the calves.\n\n7. Lower back under control and repeat for the desired reps.', 'Gastrocnemius Growth ? Builds the large, visible calf muscle for size and shape.\n\nStrength & Power ? Improves jumping, sprinting, and explosive leg drive.\n\nAnkle Stability ? Strengthens supporting structures for balance and sports performance.\n\nFunctional Strength ? Enhances walking, running, and climbing efficiency.\n\nPostural Support ? Strong calves aid standing balance and upright posture.', 'https://api.cnergy.site/image-servers.php?image=6925df26873ab_1764089638.jpg', ''),
(38, 'Seated Calf Raise', 'The Seated Calf Raise is an isolation exercise that specifically targets the soleus muscle of the calves. Unlike the standing calf raise, where the gastrocnemius (the larger, outer calf muscle) is more active, the seated version emphasizes the soleus because the knees are bent at about 90°. This exercise builds lower leg strength, endurance, and definition, and supports ankle stability for walking, running, and jumping.', '1. Sit on the seated calf raise machine, placing the balls of your feet on the foot platform with heels hanging off.\n\n2. Position your knees under the padded lever (adjust height so it rests comfortably on your thighs).\n\n3. Release the safety lever and lower your heels slowly toward the ground to stretch your calves.\n\n4. Push through the balls of your feet, raising your heels as high as possible (plantar flexion).\n\n5. Pause briefly at the top, squeezing your calves.\n\n6. Slowly lower your heels back down for a deep stretch.\n\n7. Repeat for the desired reps.', 'Soleus Development ? Isolates and strengthens the soleus for thicker, fuller calves.\n\nImproved Ankle Stability ? Supports balance and reduces risk of ankle injuries.\n\nAthletic Performance ? Enhances running, jumping, and explosive lower-body movements.\n\nPosture & Gait Support ? Strong soleus helps with walking and maintaining upright posture.\n\nJoint Health ? Strengthens tendons/ligaments around ankle and Achilles.', 'https://api.cnergy.site/image-servers.php?image=6925de46b8da8_1764089414.jpg', ''),
(39, 'Wrist Curl', 'The Wrist Curl is an isolation exercise designed to strengthen and develop the wrist flexor muscles in the forearm. It involves curling a barbell or dumbbell using only the wrists while the forearms remain supported. This movement is commonly used to build forearm size, grip strength, and wrist stability, which are crucial for pulling and lifting performance.', '1. Sit on a bench with your forearms resting on your thighs or a flat surface, palms facing upward, wrists hanging just past your knees.\n\n2. Hold a barbell (or dumbbells) with an underhand grip (palms up).\n\n3. Allow the bar to roll slightly down your fingers for a full stretch of the forearm flexors.\n\n4 . Curl your wrists upward as high as possible, contracting your forearms.\n\n5 Slowly lower the weight back down to the starting position.\n\n6. Repeat for the desired reps, maintaining controlled movement.', 'Forearm Development ? Increases size and definition of the wrist flexors.\n\nGrip Strength ? Improves ability to hold and control weights in other lifts.\n\nWrist Stability ? Reduces risk of wrist injuries during pressing and pulling exercises.\n\nCarryover to Sports ? Helps in sports requiring strong grip (climbing, grappling, racket sports).\n\nImproved Aesthetics ? Adds forearm thickness for balanced arm appearance.', 'https://api.cnergy.site/image-servers.php?image=69266be0bf83a_1764125664.jpg', ''),
(40, 'Reverse Curl', 'The Reverse Curl is a biceps variation that targets the brachialis (a muscle beneath the biceps) and the brachioradialis (a major forearm muscle). Unlike the standard curl, this movement is performed with an overhand (pronated) grip on a barbell, dumbbells, or EZ-bar. It’s effective for building arm thickness, forearm strength, and grip stability.', '1. Stand upright with feet shoulder-width apart, holding a barbell (or EZ-bar/dumbbells) with an overhand (pronated) grip, hands shoulder-width apart.\n\n2. Let the bar hang at arm’s length in front of your thighs, elbows close to your sides.\n\n3. Keeping your elbows fixed, curl the bar upward by flexing at the elbows.\n\n4 . Focus on contracting your forearms and brachialis.\n\n5. Keep wrists straight (avoid bending them).\n\n6. Raise until your forearms are just past 90° (bar near upper chest).\n\n7. Slowly lower the weight back to the starting position under control.\n\n8. Repeat for the desired reps.', 'Brachialis Development ? Builds the muscle beneath the biceps, making arms look thicker.\n\nForearm Strength ? Engages brachioradialis and wrist extensors.\n\nBalanced Arm Growth ? Prevents biceps dominance by strengthening synergist muscles.\n\nImproved Grip Strength ? Overhand grip improves wrist and grip stability.\n\nElbow Health ? Strengthens supporting muscles around the joint.', 'https://api.cnergy.site/image-servers.php?image=6925cac353059_1764084419.jpg', ''),
(41, 'Iso lateral rowing', 'The Iso-Lateral Rowing Machine is a plate-loaded or weight-stack machine designed for a horizontal pulling motion, primarily targeting the middle and upper back. The \"iso-lateral\" feature means each arm moves independently, allowing balanced strength development and correcting muscle imbalances. This machine mimics the motion of a traditional barbell or dumbbell row but provides a controlled path of motion with stability and reduced risk of improper form.', '1. Sit on the seat with your chest firmly against the chest pad and feet flat on the platform.\n\n2. Grasp the handles with a neutral, overhand, or underhand grip (depending on machine design).\n\n3. Keep your spine neutral and shoulders pulled down and back.\n\n4. Begin with your arms fully extended in front of you, feeling a stretch in your lats.\n\n5. Pull the handles back toward your torso, driving your elbows straight back.\n\n6. Squeeze your shoulder blades together at the end of the pull.\n\n7.Slowly extend your arms forward to return to the starting position.\n\n8. Repeat for the desired reps.', 'Back Thickness & Strength ? Builds a dense, powerful middle back.\n\nBalanced Muscle Development ? Iso-lateral design prevents dominance of one side.\n\nImproved Posture ? Strengthens postural muscles that retract and stabilize the scapula.\n\nSafe & Stable ? Machine-guided motion reduces strain on the lower back compared to free-weight rows.\n\nCarryover Strength ? Improves pulling power for deadlifts, pull-ups, and other back movements.', 'https://api.cnergy.site/image-servers.php?image=6925d57458088_1764087156.jpg', ''),
(42, 'Hammer Straight Pulldown Machine', 'The Hammer Strength Straight Pulldown Machine is a plate-loaded machine designed to mimic the straight-arm pulldown motion. It primarily targets the latissimus dorsi by keeping the arms straight and pulling downward in a fixed path. Unlike traditional cable straight-arm pulldowns, this machine provides stability and controlled resistance, making it easier to isolate the lats while reducing strain on stabilizers.', '1. Adjust the seat or platform so that the handles are above shoulder level when seated or standing (depending on the machine’s design).\n\n2. Grip the handles with palms facing downward (overhand/neutral depending on handle).\n\n3. Keep your arms extended but elbows slightly bent (not locked out).\n\n4. Engage your core, keep chest tall, and retract your shoulder blades slightly.\n\n5. Pull the handles downward in an arc-like motion until your hands are near your thighs.\n\n6. Squeeze your lats hard at the bottom.\n\n7. Slowly return to the starting position with controlled movement.\n\n8. Repeat for the desired reps.', 'Lat Isolation ? Directly targets the lats without heavy biceps involvement.\n\nBack Width Development ? Builds the “V-taper” shape by widening the back.\n\nControlled Motion ? Safer than free-weight/cable alternatives due to fixed path.\n\nMind-Muscle Connection ? Easier to feel and engage the lats.\n\nStability ? Machine support reduces reliance on smaller stabilizers, allowing focus on lats.', 'https://api.cnergy.site/image-servers.php?image=6924a4d1ac3e9_1764009169.jfif', ''),
(43, 'Leg Extension', 'The Leg Extension is an isolation exercise performed on a leg extension machine that primarily targets the quadriceps on the front of the thighs. It involves extending the knee against resistance in a controlled seated position. Because of its isolated nature, it’s excellent for building quad size, strength, and definition, as well as for rehabilitation after knee or leg injuries (when performed properly).', '1. Sit on the leg extension machine with your back flat against the pad.\n\n2. Adjust the back pad so your knees align with the machine’s pivot point.\n\n3. Place your ankles behind the padded lever.\n\n4. Grip the side handles for stability.\n\n5. Begin with your knees bent at about 90°.\n\n6. Exhale and extend your legs upward until they are almost straight (avoid locking out forcefully).\n\n7. Pause briefly and contract the quadriceps at the top.\n\n8. Inhale and slowly lower the weight back to the starting position.\n\n9. Repeat for the desired reps.', 'Quadriceps Isolation ? Specifically targets the quads without hip involvement.\n\nMuscle Growth ? Builds size and definition in the thighs.\n\nStrength for Sports ? Improves kicking, sprinting, and jumping power.\n\nRehabilitation Tool ? Commonly used in rehab to rebuild quad strength post-injury.\n\nMind-Muscle Connection ? Easy to focus on quad contraction for maximum engagement.', 'https://api.cnergy.site/image-servers.php?image=6925dd018c00c_1764089089.jpg', 'https://api.cnergy.site/image-servers.php?image=68ff9412d08a1_1761580050.mp4'),
(44, 'Triceps Cable Pushdown', 'The Triceps Cable Pushdown (also called Cable Triceps Pressdown) is an isolation exercise performed on a cable machine to target the triceps brachii—the muscles at the back of your upper arms. Using a straight bar, V-bar, or rope attachment, you push the handle downward by extending your elbows. This movement builds triceps strength, size, and definition, and improves lockout performance in pressing exercises like the bench press and overhead press.', '1. Attach a straight bar, V-bar, or rope handle to a high pulley on a cable machine.\n\n2. Stand facing the machine with your feet shoulder-width apart.\n\n3. Grip the bar/rope with an overhand grip (palms facing down) and keep your elbows close to your sides.\n\n4. Start with your forearms slightly above parallel to the floor.\n\n5. Exhale and push the handle downward by extending your elbows until your arms are fully straightened.\n\n6. Pause briefly at the bottom and squeeze your triceps.\n\n7. Inhale and slowly return the handle to the starting position.\n\n8. Repeat for the desired reps.', 'Triceps Isolation ? Directly targets the triceps with minimal shoulder involvement.\n\nArm Definition & Size ? Builds shape and tone in the upper arms.\n\nJoint Stability ? Strengthens elbow extensors for better control in pushing movements.\n\nVersatility ? Different attachments (rope, bar, reverse grip) hit triceps from various angles.\n\nLow Injury Risk ? Controlled cable resistance is gentle on joints.\n\nFunctional Carryover ? Improves lockout strength for bench press, dips, and overhead presses.', 'https://api.cnergy.site/image-servers.php?image=6925d07086370_1764085872.jpg', ''),
(45, 'Cable Triceps Extension', 'The Cable Triceps Extension is an isolation exercise that targets the triceps brachii—the large muscle on the back of your upper arm. It involves extending the elbow joint against resistance from a cable machine, keeping constant tension on the triceps throughout the movement. This exercise can be done standing, seated, or overhead, depending on the attachment and angle used. It helps in building triceps size, definition, and lockout strength for pressing movements.', '1. Attach a rope handle to the low pulley of a cable machine.\n\n2. Grab the rope and turn away from the machine, bringing your hands behind your head.\n\n3. Stagger your stance for balance and keep your elbows close to your ears.\n\n4. Begin with your elbows bent at about 90 degrees.\n\n5. Extend your elbows and push the rope forward and upward until your arms are fully straight.\n\n6. Squeeze your triceps at the top of the movement.\n\n7. Slowly return to the starting position under control.\n\n8. Repeat for the desired reps.', 'Triceps Isolation ? Focuses on strengthening and developing all three triceps heads.\n\nLong Head Emphasis ? Overhead angle stretches and activates the long head more than pushdowns.\n\nConstant Tension ? Cables maintain resistance throughout the full range of motion.\n\nImproves Arm Shape ? Helps create balanced, well-defined upper arms.\n\nSupports Compound Lifts ? Improves lockout strength for presses and dips.', 'https://api.cnergy.site/image-servers.php?image=6925c31335538_1764082451.jpg', 'https://api.cnergy.site/image-servers.php?image=68ff98150b265_1761581077.mp4'),
(46, 'Overhead Triceps Cable Rope Extension', 'The Overhead Triceps Cable Rope Extension is an isolation exercise that targets the long head of the triceps brachii, located at the back of the upper arm. Using a cable machine with a rope attachment, this movement emphasizes elbow extension while maintaining constant tension through the range of motion. The overhead angle stretches the triceps, promoting greater muscle activation, growth, and definition. It’s ideal for developing the inner and upper portion of the triceps for a fuller arm appearance.', '1. Attach a rope handle to the low pulley of a cable machine.\n\n2. Grab both ends of the rope with a neutral grip (palms facing each other).\n\n3. Turn away from the machine so that your back faces it.\n\n4. Step one foot forward for stability and bring the rope behind your head, keeping your elbows close to your ears.\n\n5. Start with your elbows bent and hands just behind your head.\n\n6. Extend your arms forward and upward until your elbows are fully straightened.\n\n7. Squeeze your triceps at the top of the movement.\n\n8. Slowly lower the rope back to the starting position with control.\n\n9. Repeat for the desired number of reps (typically 10–15).', 'Targets the Long Head of the Triceps: The overhead position stretches and isolates the long head, often underdeveloped in other triceps exercises.\n\nConstant Tension: The cable maintains resistance through both concentric and eccentric phases.\n\nImproves Triceps Definition: Great for shaping the back of the upper arm.\n\nEnhances Pressing Strength: Strengthens the lockout portion of pressing movements (bench, shoulder press, dips).\n\nJoint-Friendly Alternative: Provides a smoother, more controlled resistance compared to dumbbells or barbells.\n\nVersatile: Can be performed standing, seated, or single-arm for variation and balance.', 'https://api.cnergy.site/image-servers.php?image=6925c809853ab_1764083721.jpg', ''),
(47, 'Reverse Barbell Curl', 'The Reverse Barbell Curl is a compound isolation exercise that targets the brachialis and brachioradialis, as well as the biceps brachii to a lesser extent. Unlike traditional curls that use a supinated (underhand) grip, this exercise uses a pronated (overhand) grip, shifting emphasis from the main biceps muscle to the underlying muscles of the upper arm and forearm. It helps improve arm thickness, grip strength, and muscle balance between the upper and lower arms.', '1. Stand upright with your feet shoulder-width apart.\n\n2. Hold a barbell (straight or EZ-bar) with an overhand (pronated) grip, hands about shoulder-width apart.\n\nLet the barbell hang at arm’s length in front of you, elbows close to your torso.\n\nKeep your upper arms stationary, and curl the bar upward by bending your elbows.\n\nPause at the top and squeeze your forearms and biceps.\n\nSlowly lower the barbell back down to the starting position under control.\n\nRepeat for 10–15 reps per set.', 'Builds Forearm Strength: Focuses on the brachioradialis for thicker, stronger forearms.\n\nEnhances Grip Power: Improves wrist and hand stability.\n\nBalances Arm Development: Strengthens muscles that are often neglected in regular curls.\n\nImproves Aesthetics: Adds width to the upper arm and definition to the forearms.\n\nReduces Muscle Imbalances: Prevents overdeveloped biceps by engaging supporting muscles.\n\nBoosts Lifting Performance: Strengthens forearms and grip for pulling exercises (like rows, deadlifts, pull-ups).', 'https://api.cnergy.site/image-servers.php?image=6925c875ac490_1764083829.jpg', '');
INSERT INTO `exercise` (`id`, `name`, `description`, `instructions`, `benefits`, `image_url`, `video_url`) VALUES
(48, 'Concentration Curl', 'The Concentration Curl is an isolation exercise that specifically targets the biceps brachii, especially the short head. It’s performed while seated, using a single dumbbell, and focuses on strict form and controlled motion to maximize biceps peak contraction. By stabilizing the upper arm against the inner thigh, it eliminates momentum and shoulder involvement, ensuring pure biceps activation. This exercise is ideal for improving bicep shape, definition, and mind-muscle connection.', '1. Sit on the edge of a flat bench with your feet spread apart.\n\n2. Hold a dumbbell in your right hand with your palm facing up (supinated grip).\n\n3. Rest your upper right arm against the inside of your right thigh—this keeps it stationary.\n\n4. Let the dumbbell hang at arm’s length toward the floor.\n\n5. Curl the dumbbell upward by bending your elbow, keeping your upper arm still.\n\n6. Squeeze your biceps hard at the top of the movement.\n\n7. Slowly lower the weight back to the starting position under control.\n\n8. Repeat for the desired reps, then switch arms.', 'Maximum Biceps Isolation: Minimizes shoulder and back involvement.\n\nEnhances Peak Contraction: Builds the biceps “peak” by fully shortening the muscle.\n\nImproves Mind-Muscle Connection: Ideal for developing better control and focus on the biceps.\n\nCorrects Imbalances: Trains each arm individually for symmetry.\n\nIncreases Arm Definition: Helps carve out a well-rounded biceps shape.\n\nLow Joint Stress: Safe and joint-friendly movement when done with proper form.', 'https://api.cnergy.site/image-servers.php?image=6925c43aec568_1764082746.jpg', 'https://api.cnergy.site/image-servers.php?image=69249eb9f0f9f_1764007609.mp4'),
(49, 'Cross Body Hammer Curl', 'The Cross-Body Hammer Curl is a compound isolation exercise that targets the brachialis and brachioradialis muscles, along with the biceps brachii. Unlike the traditional hammer curl, where you lift the dumbbell straight up, the cross-body version moves the dumbbell diagonally across the body toward the opposite shoulder. This motion emphasizes the brachialis (which lies underneath the biceps), contributing to greater arm thickness and overall upper-arm strength. It’s a great movement for balanced biceps and forearm development.', '1. Stand upright with your feet shoulder-width apart, holding a dumbbell in each hand using a neutral grip (palms facing your torso).\n\n2. Let your arms hang naturally at your sides.\n\n3. Keeping your elbows close to your body, curl one dumbbell across your torso toward the opposite shoulder.\n\n4. Example: Right arm curls diagonally toward the left shoulder.\n\n5. Squeeze your biceps and forearm at the top of the movement.\n\n6. Slowly lower the dumbbell back to the starting position under control.\n\n7. Alternate arms and repeat for the desired reps.', 'Builds Arm Thickness: Targets the brachialis, adding density beneath the biceps.\n\nImproves Forearm Strength: Strong activation of the brachioradialis and grip muscles.\n\nEnhances Functional Strength: Strengthens muscles used in everyday pulling and gripping motions.\n\nBalances Arm Development: Works both biceps and forearms for symmetry.\n\nJoint-Friendly: Neutral grip reduces stress on wrists and elbows.\n\nIncreases Grip Endurance: Excellent for improving grip and wrist stability.', 'https://api.cnergy.site/image-servers.php?image=6925c48c1cd00_1764082828.jpg', 'https://api.cnergy.site/image-servers.php?image=69249f545784f_1764007764.mp4'),
(50, 'Bayesian Curl', 'The Bayesian Curl is an isolation exercise for the biceps brachii, particularly the long head, performed using a cable machine. Unlike standard curls, you perform this exercise standing slightly in front of the cable machine, allowing the cable to pull your arm slightly backward. This position stretches the long head of the biceps at the start of the movement and keeps constant tension on the muscle throughout the range of motion — something dumbbells cannot do due to gravity.', '1. Attach a single handle to the low pulley of a cable machine.\n\n2. Stand facing away from the machine, and grab the handle with one hand using a supinated grip (palm facing forward).\n\n3. Step one or two feet forward, allowing the cable to pull your arm slightly behind your torso.\n\n4. Keep your chest up, shoulders back, and your elbow fixed close to your side.\n\n5. Starting from a stretched position, curl the handle upward toward your shoulder by bending your elbow.\n\n6. Squeeze your biceps at the top of the movement.\n\n7. Slowly lower the handle back to the starting position, feeling the stretch in your biceps.\n\n8. Repeat for 10–15 reps, then switch arms.', 'Constant Tension: Cable keeps continuous resistance on the biceps throughout the movement.\n\nStretches the Long Head: The behind-the-body position emphasizes the long head, improving biceps length and fullness.\n\nImproves Arm Shape: Great for developing the biceps “peak.”\n\nBetter Mind-Muscle Connection: Isolates the biceps more effectively than barbell or dumbbell curls.\n\nReduces Joint Stress: Smooth, controlled motion is easy on wrists and elbows.\n\nUnilateral Strength: Trains each arm independently to correct imbalances.', 'https://api.cnergy.site/image-servers.php?image=6924971a84d83_1764005658.jpg', 'https://api.cnergy.site/image-servers.php?image=6924967b7878c_1764005499.mp4'),
(51, 'EZ-Bar Curl', 'The EZ-Bar Curl is a compound isolation exercise targeting the biceps brachii, particularly emphasizing both the short and long heads while minimizing wrist strain. The EZ-bar’s angled grip places your hands in a more natural semi-supinated position, which helps reduce forearm and wrist stress compared to a straight barbell.', '1. Setup:\n\nStand upright with your feet shoulder-width apart.\n\nGrip the EZ bar using the inner angled grips (close grip for inner biceps or outer grip for outer biceps focus).\n\nLet your arms hang fully extended at your sides with elbows close to your torso.\n\n2. Curl:\n\nKeeping your upper arms stationary, curl the bar upward by flexing your elbows.\n\nContinue lifting until the bar is near your shoulders and your biceps are fully contracted.\n\nSqueeze your biceps at the top of the movement.\n\n3. Lowering:\n\nSlowly lower the bar back down to the starting position, maintaining control.\n\nAvoid letting your elbows drift forward or swinging the bar.\n\n4. Repeat:\n\nPerform 3–4 sets of 8–12 controlled reps for muscle growth.', 'Builds Biceps Mass & Strength: Excellent for overall arm development.\n\nWrist-Friendly Grip: EZ bar’s angled grip reduces strain on wrists and elbows.\n\nTargets Multiple Biceps Heads: Both the short and long heads are engaged effectively.\n\nImproves Arm Aesthetics: Contributes to a balanced and well-rounded biceps peak.\n\nVersatile Grip Options: Inner or outer grip allows emphasis shift between inner and outer biceps.', 'https://api.cnergy.site/image-servers.php?image=6924a2ca9133a_1764008650.jpg', 'https://api.cnergy.site/image-servers.php?image=6924a2cbd8b40_1764008651.mp4'),
(52, 'Rope Cable Curl', 'The Rope Cable Curl is an isolation exercise that targets the biceps brachii, brachialis, and brachioradialis using a rope attachment on a low cable pulley. Unlike barbell or dumbbell curls, the cable provides constant tension throughout the entire movement, maximizing muscle engagement during both the concentric (lifting) and eccentric (lowering) phases.', '1. Setup:\n\nAttach a rope handle to the low pulley of a cable machine.\n\nStand facing the machine, feet shoulder-width apart.\n\nHold the rope with a neutral grip (palms facing each other).\n\nKeep your elbows close to your torso and your back straight.\n\n2. Curl the Rope:\n\nExhale as you curl the rope upward by bending your elbows.\n\nKeep your upper arms stationary and focus on contracting your biceps.\n\nAs you reach the top, separate the rope ends outward, bringing them toward your shoulders.\n\n3. Squeeze and Lower:\n\nHold the contraction briefly and squeeze your biceps.\n\nInhale as you slowly lower the rope back to the starting position with control.\n\n4. Repeat:\n\nPerform 3–4 sets of 10–15 reps for best muscle growth results.', '1. Constant Tension:\n\nThe cable system maintains tension throughout the entire range of motion for better muscle activation.\n\n 2. Builds Arm Thickness:\n\nTargets not just the biceps but also the brachialis and forearms, creating fuller-looking arms.\n\n 3. Wrist-Friendly:\n\nThe rope’s natural grip position reduces wrist and forearm strain compared to straight bars.\n\n 4. Improves Grip Strength:\n\nThe rope’s loose ends require greater forearm engagement to stabilize the movement.\n\n5. Versatile and Effective:\n\nSuitable for beginners and advanced lifters, and can be performed standing or seated.', 'https://api.cnergy.site/image-servers.php?image=6925cb84458db_1764084612.jpg', ''),
(53, 'Reverse Cable Curl', 'The Reverse Cable Curl is an isolation exercise that targets the brachialis, brachioradialis, and forearms, while also working the biceps brachii as a secondary muscle. Unlike standard curls, this movement uses an overhand (pronated) grip, which shifts emphasis away from the biceps’ peak and focuses more on the upper forearm and elbow flexor muscles.', '1. Setup:\n\nAttach a straight bar (or EZ-bar handle) to the low pulley of a cable machine.\n\nStand upright, facing the machine, with feet shoulder-width apart.\n\nGrasp the bar using an overhand grip (palms facing down) at shoulder-width distance.\n\nKeep your arms fully extended and elbows close to your torso.\n\n2. Curl the Bar:\n\nExhale and curl the bar upward by bending your elbows.\n\nKeep your upper arms stationary — only your forearms should move.\n\nRaise the bar until your forearms are vertical or your hands are near shoulder level.\n\n3. Lower the Bar:\n\nInhale as you slowly lower the bar back to the starting position.\n\nKeep the motion controlled and avoid using momentum.\n\n4. Repetition:\n\nPerform 3–4 sets of 10–15 reps for optimal results.', '1. Strengthens the Forearms and Brachialis\n\nTargets the muscles often neglected in traditional curls, improving forearm and upper arm thickness.\n\n2. Enhances Grip Strength\n\nThe overhand grip increases forearm activation, improving grip for other lifts.\n\n3. Builds Balanced Arm Development\n\nComplements standard curls by working opposing muscles, leading to more proportional arm strength.\n\n4. Reduces Muscle Imbalances\n\nStrengthens the brachialis and brachioradialis to support elbow joint health and function.\n\n5. Constant Tension with Cable Resistance\n\nThe cable ensures resistance through the entire movement, maximizing muscle engagement.', 'https://api.cnergy.site/image-servers.php?image=6925c98b1cdb7_1764084107.jpg', ''),
(54, 'Rope Triceps Pushdown', 'The Rope Triceps Pushdown is an isolation exercise that targets the triceps brachii, performed using a cable machine with a rope attachment. The movement emphasizes the lateral and long heads of the triceps and allows for a greater range of motion compared to a straight bar pushdown. By spreading the rope apart at the bottom of the movement, you achieve maximum triceps contraction.', '1. Setup:\n\nAttach a rope handle to the high pulley of a cable machine.\n\nStand upright with feet shoulder-width apart.\n\nGrasp the rope with a neutral grip (palms facing each other).\n\n2. Starting Position:\n\nKeep your elbows tucked close to your torso.\n\nYour upper arms should remain stationary throughout the movement.\n\nLean slightly forward at the hips and engage your core.\n\n3. Execution:\n\nExhale and push the rope down by extending your elbows.\n\nAt the bottom, separate the rope ends and squeeze your triceps for 1–2 seconds.\n\nSlowly return to the starting position while inhaling, keeping control of the weight.\n\n4. Tips:\n\nAvoid swinging your body or using momentum.\n\nKeep your elbows fixed — only your forearms should move.\n\nFocus on feeling the triceps stretch and contract through each rep', '1.  Builds size and definition in the triceps.\n\n2 .Allows for greater isolation compared to bar variations.\n\n3. Provides constant tension on the triceps throughout the movement.\n\n4. The rope attachment increases the range of motion and contraction at the bottom.\n\n5. Safe and effective for all levels (beginner to advanced).', 'https://api.cnergy.site/image-servers.php?image=6925cd6f4bcc0_1764085103.jpg', ''),
(55, 'Dumbbell Overhead Triceps Extension (One or Two Arms)', 'The Dumbbell Overhead Triceps Extension is an isolation exercise that targets the triceps brachii, particularly the long head, which is emphasized when the arms are raised overhead. It can be performed seated or standing, using one or two dumbbells. This movement helps build mass, strength, and definition in the back of the arms and improves stability in the shoulders and elbows.', 'Setup:\n\n1. Choose a dumbbell of moderate weight.\n\n2. Sit on a bench with back support or stand upright with feet shoulder-width apart.\n\n3. Grasp the dumbbell with both hands (or one hand if doing single-arm variation).\n\n4. Raise the dumbbell overhead until your arms are fully extended, keeping your elbows close to your head.\n\nExecution:\n\n1. Inhale as you slowly lower the dumbbell behind your head by bending your elbows.\n\n2. Keep your upper arms stationary — only your forearms should move.\n\n3. Exhale as you extend your elbows, raising the dumbbell back up to the starting position.\n\n4. Repeat for the desired number of reps.', '1. Builds and strengthens the long head of the triceps (upper arm thickness).\n\n2. Increases arm size and definition.\n\n3. Improves lockout strength in pressing movements (bench press, shoulder press).\n\n4. Enhances shoulder and elbow stability.\n\n5. Can be performed anywhere with minimal equipment.', 'https://api.cnergy.site/image-servers.php?image=6925c5b596915_1764083125.jpg', 'https://api.cnergy.site/image-servers.php?image=6924a160286fa_1764008288.mp4'),
(56, 'Dumbbell Skull Crusher', 'The Dumbbell Skull Crusher (also known as the Lying Dumbbell Triceps Extension) is an isolation exercise that primarily targets the triceps brachii. It’s performed lying on a flat bench while lowering dumbbells toward your forehead (hence the name “skull crusher”) and extending the arms back up.\n\nUsing dumbbells instead of a barbell allows for greater range of motion and independent arm movement, helping to correct muscle imbalances and increase triceps activation.', 'Setup:\n\n1. Lie flat on a bench with a dumbbell in each hand.\n\n2. Hold the dumbbells directly above your chest with your palms facing each other (neutral grip).\n\n3. Keep your elbows tucked in and arms perpendicular to the floor.\n\nExecution:\n\n1. Inhale and slowly bend your elbows, lowering the dumbbells toward your forehead or just above it.\n\n2. Keep your upper arms stationary — only your forearms should move.\n\n3. Exhale and extend your elbows to return the dumbbells to the starting position.\n\n4. Squeeze your triceps at the top of the movement.\n\n5. Repeat for the desired reps.', '1. Builds mass and strength in all three triceps heads.\n\n2. Enhances lockout power for pressing movements (bench press, shoulder press).\n\n3. Increases arm definition and shape.\n\n4. Using dumbbells allows independent arm movement, improving balance and stability.\n\n5. Promotes joint-friendly mechanics compared to straight bar variations.', 'https://api.cnergy.site/image-servers.php?image=6925c64b4c1ed_1764083275.jpg', 'https://api.cnergy.site/image-servers.php?image=6924a24938715_1764008521.mp4'),
(57, 'Dumbbell Close Grip Bench Press', 'The Dumbbell Close-Grip Bench Press is a compound exercise that targets the triceps and inner chest (pectoralis major). It’s performed by pressing two dumbbells close together using a narrow grip while lying on a flat bench.\n\nUnlike the traditional bench press, the close grip shifts more emphasis to the triceps brachii and anterior deltoids, making it an excellent strength and hypertrophy movement for the arms and chest. It’s also safer on the shoulders compared to barbell variations due to the neutral hand position.', 'Setup:\n\n1. Lie flat on a bench with a dumbbell in each hand, resting them on your thighs.\n\n2. Use your legs to help lift the dumbbells and position them close together above your chest, palms facing each other (neutral grip).\n\n3. Keep your feet flat on the floor and engage your core.\n\nExecution:\n\n1. Inhale as you lower the dumbbells slowly toward the middle of your chest, keeping your elbows close to your sides.\n\n2. Pause briefly when the dumbbells are just above your chest.\n\n3. Exhale as you press the dumbbells upward, focusing on squeezing your triceps and chest at the top.\n\n4. Repeat for the desired number of reps.', '1. Builds stronger and bigger triceps while engaging the chest.\n\n2. Enhances pressing strength and lockout power for bench and shoulder presses.\n\n3. Improves arm definition and inner chest thickness.\n\n4. Promotes shoulder safety by allowing a natural wrist and elbow alignment.\n\n5. Increases muscle coordination and balance between both arms.', 'https://api.cnergy.site/image-servers.php?image=6925c50080ef2_1764082944.jpg', 'https://api.cnergy.site/image-servers.php?image=6924a09f15baa_1764008095.mp4'),
(58, 'Incline Cable Skull Crusher', 'The Incline Cable Skull Crusher is an isolation exercise that targets all three heads of the triceps brachii, with an emphasis on the long head due to the incline position. This movement is performed using a cable machine with either a straight bar, EZ-bar attachment, or rope, while lying on an incline bench. The incline angle increases the stretch on the triceps throughout the movement and provides constant tension thanks to the cable resistance — something free weights can’t achieve as effectively.', 'Setup:\n\n1. Set an adjustable bench to a 30–45° incline.\n\n2. Position the bench a few feet away from a low pulley cable machine.\n\n3. Attach an EZ-bar or rope handle to the cable.\n\n4. Lie back on the bench and grasp the attachment with an overhand or neutral grip.\n\n5. Extend your arms so the cable is pulling slightly behind your head — this ensures constant tension from start to finish.\n\nExecution:\n\n1. Inhale as you lower the bar or rope toward your forehead (or just behind your head) by bending your elbows.\n\n2. Keep your upper arms stationary — only your forearms should move.\n\n3. Feel a stretch in your triceps at the bottom of the motion.\n\n4. Exhale as you extend your arms, bringing the attachment back to the starting position.\n\n5. Squeeze your triceps at the top before lowering again in a controlled manner.', '1. Provides constant resistance throughout the entire range of motion.\n\n2. Targets the long head of the triceps more effectively due to the incline angle.\n\n3. Builds size, definition, and strength in the triceps.\n\n4. Reduces joint stress compared to barbell or dumbbell skull crushers.\n\n5. Enhances mind–muscle connection with improved control and stretch', 'https://api.cnergy.site/image-servers.php?image=6925c71f1992b_1764083487.jpg', ''),
(59, 'Hack Squat', 'The Hack Squat is a compound lower-body exercise performed on a hack squat machine that primarily targets the quadriceps, while also engaging the glutes, hamstrings, and calves. The exercise mimics a squat motion but is done on a sled that moves along a fixed track, allowing for a more controlled movement and increased stability. The back-supported position reduces lower-back strain, making it a great alternative or supplement to traditional squats.', 'Setup:\n\n1. Position yourself on the hack squat machine with your back flat against the pad.\n\n2. Place your shoulders under the pads and your feet shoulder-width apart on the platform.\n\n3. Keep your toes slightly pointed out (about 10–15 degrees).\n\n4. Engage your core and look forward.\n\nExecution:\n\n1. Unlock the safety handles to release the sled.\n\n2. Inhale as you slowly lower yourself by bending your knees and hips, keeping your back against the pad.\n\n3. Descend until your thighs are parallel (or slightly below parallel) to the platform.\n\n4. Exhale as you press through your heels, extending your legs to return to the starting position.\n\n5. Do not lock out your knees at the top; maintain tension on the muscles.\n\n6. Repeat for the desired reps, then re-engage the safety handles.', '', 'https://api.cnergy.site/image-servers.php?image=6925db74f2ef6_1764088692.jpg', ''),
(60, 'Cable Kickback', 'The Cable Kickback (also known as the Glute Kickback) is an isolation exercise that targets the gluteus maximus, the largest muscle of the buttocks. It’s performed using a cable machine with an ankle strap attachment. The exercise involves extending the leg backward against resistance, which activates the glutes and helps improve lower body strength, muscle tone, and stability.', 'Setup:\n\n1. Attach an ankle cuff or strap to the low pulley of a cable machine.\n\n2. Secure the cuff around your ankle (one leg at a time).\n\n3. Stand facing the machine, holding the frame or handle for support.\n\n4. Step back slightly to create tension in the cable and keep your working leg slightly bent at the knee.\n\nExecution:\n\n1. Inhale and keep your core tight.\n\n2. Exhale as you extend your leg backward and upward, squeezing your glutes at the top of the movement.\n\n3. Pause for a second at full extension for maximum contraction.\n\n4. Inhale as you slowly return your leg to the starting position without letting the cable rest.\n\n5. Complete your desired reps, then switch to the other leg.', 'Isolates and strengthens the gluteus maximus effectively.\n\nHelps tone, lift, and shape the buttocks.\n\nImproves hip extension strength and stability.\n\nGreat for enhancing athletic performance (sprinting, \njumping).\n\nConstant tension from the cable increases muscle activation.\n\nCan help correct muscle imbalances between the left and right glutes.', 'https://api.cnergy.site/image-servers.php?image=6925da59c7515_1764088409.jpg', 'https://api.cnergy.site/image-servers.php?image=69249befcf4f3_1764006895.mp4'),
(61, 'Sumo Deadlift', 'The Sumo Deadlift is a variation of the traditional deadlift that uses a wide stance and narrow hand grip. It primarily targets the glutes, hamstrings, quadriceps, and inner thighs, while also engaging the lower back, traps, and core.', 'Setup:\n\n1. Stand with your feet wider than shoulder-width apart, toes pointing slightly outward (around 30–45°).\n\n2. Position the barbell directly over the middle of your feet.\n\n3. Bend at the hips and knees, keeping your chest up and back flat.\n\n4. Grip the barbell with your hands inside your knees (a double overhand or mixed grip works best).\n\n5. Engage your core and set your lats by pulling your shoulders down and back.\n\nExecution:\n\n1. Inhale deeply and brace your core.\n\n2. Drive your feet into the floor and push through your heels, extending your hips and knees simultaneously.\n\n3. Keep the barbell close to your shins as you pull it upward in a straight line.\n\n4. At the top, lock out your hips and squeeze your glutes without leaning back.\n\n5. Exhale and lower the bar slowly back to the ground by hinging at the hips first, then bending the knees.\n\n6. Reset and repeat for the desired number of reps.', 'Builds total-body strength, especially in the glutes, hamstrings, and quads.\n\nEnhances hip mobility and flexibility.\n\nReduces lower back strain compared to the conventional deadlift.\n\nImproves posture and core stability.\n\nIncreases athletic performance by strengthening posterior chain muscles.\n\nHelps develop explosive power for sports and functional activities.', 'https://api.cnergy.site/image-servers.php?image=6925dff454f3e_1764089844.jpg', ''),
(62, 'Bent Over Barbell Row', 'The Bent-Over Barbell Row is a compound pulling exercise that primarily targets the middle and upper back while engaging multiple supporting muscles, including the lats, traps, rhomboids, and rear delts. It involves pulling a barbell toward your torso while maintaining a bent-over position, promoting back thickness, posture strength, and pulling power.', '1. Setup\n\nStand with your feet shoulder-width apart.\n\nGrip the barbell with an overhand (pronated) grip, hands just wider than shoulder-width.\n\nBend your knees slightly and hinge forward at your hips until your torso is about 45° (or nearly parallel) to the floor. Keep your back straight and core tight.\n\n2. Execution\n\nExhale and pull the barbell toward your lower ribcage or upper abdomen.\n\nSqueeze your shoulder blades together at the top of the movement.\n\nInhale as you slowly lower the barbell back down with control, allowing your arms to extend fully.\n\n3. Form Tips\n\nKeep your core braced to protect your lower back.\n\nAvoid rounding your spine or jerking the bar.\n\nMaintain a stable hip hinge—don’t stand up during the row.', 'Builds a thicker, stronger back by targeting multiple muscle groups.\n\nEnhances posture and spinal stability.\n\nImproves pulling strength for exercises like deadlifts and pull-ups.\n\nStrengthens core and lower back due to the static position.\n\nPromotes muscle balance between chest and back.', 'https://api.cnergy.site/image-servers.php?image=6925d483cb8c4_1764086915.jpg', 'https://api.cnergy.site/image-servers.php?image=692497de07718_1764005854.mp4'),
(63, 'Hanging Knee Raise', 'The Hanging Knee Raise is a bodyweight core exercise that targets the abdominal muscles, especially the lower abs. It involves hanging from a pull-up bar and lifting the knees toward the chest through controlled hip flexion. This move enhances core strength, stability, and control, while also engaging the hip flexors and grip muscles for support.', '1. Setup\n\nHang from a pull-up bar using an overhand grip (palms facing away).\n\nKeep your arms straight and your body fully extended.\n\nEngage your core and keep your shoulders slightly pulled down (avoid shrugging).\n\n2. Execution\n\nExhale and lift your knees toward your chest by contracting your abs.\n\nKeep the movement smooth and controlled — avoid swinging.\n\nPause briefly at the top for maximum contraction.\n\nInhale and slowly lower your legs back to the starting position.\n\n 3. Form Tips\n\nAvoid using momentum — control every rep.\n\nKeep your spine neutral (avoid leaning too far back).\n\nFocus on using your abs to lift, not just your hip flexors.\n\nEngage your lats slightly to stabilize your upper body.', 'Strengthens the lower abdominal muscles effectively.\n\nEnhances core stability and posture control.\n\nBuilds hip flexor strength for better athletic movement.\n\nImproves grip endurance and shoulder stability.\n\nHelps develop a defined, balanced core when combined with upper ab work.', 'https://api.cnergy.site/image-servers.php?image=6925d949914a3_1764088137.jpg', ''),
(64, 'Treadmill Run / Walk', 'The Treadmill Run/Walk is a cardiovascular and endurance exercise performed on a treadmill machine that simulates outdoor walking or running. It allows users to control speed, incline, and duration, providing a safe, convenient, and consistent environment for improving heart health, stamina, and lower-body strength.', '1. Setup\n\nStep onto the treadmill and attach the safety clip to your clothing.\n\nSelect your desired mode (manual or programmed workout).\n\nStart at a slow walking pace (2–3 km/h) to warm up.\n\n2. Execution\n\nGradually increase speed to your target walking or running pace.\n\nMaintain an upright posture: shoulders relaxed, head facing forward, and arms swinging naturally.\n\nFor running, keep your foot strike light (midfoot or forefoot landing preferred).\n\nAdjust incline to simulate uphill terrain for increased intensity.\n\nCool down for 3–5 minutes at a slower pace after your session.\n\n3. Form Tips\n\nAvoid leaning forward or holding the handrails for balance (unless necessary).\n\nEngage your core and maintain steady breathing.\n\nUse proper footwear to prevent joint stress.', '- Improves cardiovascular health and lung capacity.\n\n- Strengthens lower-body muscles (legs, glutes, calves).\n\n- Burns calories and supports fat loss.\n\n- Enhances endurance and stamina.\n\n- Promotes mental health and reduces stress through aerobic activity.\n\n- Allows safe indoor training regardless of weather.', 'https://api.cnergy.site/image-servers.php?image=69266c5ddaf98_1764125789.jpg', ''),
(65, 'Kettlebell Swing', 'The Kettlebell Swing is a dynamic compound exercise that primarily targets the posterior chain — including the glutes, hamstrings, and lower back — through a powerful hip hinge motion. It builds explosive strength, endurance, and cardiovascular conditioning by repeatedly swinging a kettlebell from between the legs to shoulder height (Russian swing) or overhead (American swing).', '1. Setup\n\nPlace a kettlebell on the floor about one foot in front of you.\n\nStand with your feet shoulder-width apart, toes slightly turned out.\n\nHinge at the hips, keeping your back flat and knees slightly bent, then grasp the kettlebell handle with both hands (palms facing you).\n\n2. Execution\n\nHike the kettlebell back between your legs (like a football snap) while maintaining a neutral spine.\n\nExplosively extend your hips and knees to swing the kettlebell forward and upward using hip drive (not arms).\n\nLet the kettlebell float up to chest height (for Russian swing) as your glutes contract.\n\nControl the downswing by hinging your hips backward again and repeat the motion rhythmically.\n\n3. Breathing\n\nInhale as the kettlebell moves down.\n\nExhale forcefully as you drive your hips forward.\n\n4. Form Tips\n\nKeep your core tight and spine neutral — avoid rounding your back.\n\nThe power comes from your hips, not your arms.\n\nKeep your shoulders relaxed and avoid overextending at the top.', '? Benefits\n\nStrengthens the posterior chain (glutes, hamstrings, lower back).\n\nImproves power, explosiveness, and hip drive — essential for athletes.\n\nEnhances cardiovascular fitness and burns high calories.\n\nBuilds core strength and stability.\n\nImproves posture and balance.\n\nIncreases grip strength and coordination.', 'https://api.cnergy.site/image-servers.php?image=6925dc0405818_1764088836.jpg', ''),
(66, 'Incline Barbell Press', 'The Incline Barbell Press is a compound upper-body exercise that primarily targets the upper portion of the pectoral muscles (chest) while also engaging the shoulders and triceps. By pressing a barbell on an incline bench (typically set at 30–45 degrees), this exercise emphasizes the clavicular head of the pectoralis major, helping develop a fuller, more balanced chest and improved pushing strength.', '1. Setup\n\nAdjust the bench to a 30–45° incline.\n\nLie on the bench with your feet flat on the floor and your back firmly pressed against the pad.\n\nGrip the barbell slightly wider than shoulder-width (overhand grip).\n\nUnrack the barbell and position it directly above your upper chest with your arms extended.\n\n2. Execution\n\nInhale and slowly lower the barbell to your upper chest (just below the collarbone).\n\nKeep your elbows at about a 45° angle to your torso.\n\nExhale and press the barbell upward until your arms are fully extended.\n\nPause briefly at the top, then repeat for the desired reps.\n\n3. Form Tips\n\nKeep your shoulder blades retracted (squeezed together) throughout the lift.\n\nDo not bounce the bar off your chest.\n\nMaintain a slight arch in your lower back, but keep your glutes and upper back in contact with the be', 'Builds upper chest mass and strength.\n\nEnhances shoulder and triceps development.\n\nImproves pushing power and upper-body performance.\n\nCreates a balanced, aesthetic chest (upper-to-lower proportion).\n\nStrengthens shoulder stability and overall bench press mechanics.', 'https://api.cnergy.site/image-servers.php?image=6925d89b800cb_1764087963.jpg', ''),
(67, 'Incline Smith Machine Press', 'The Incline Smith Machine Press is a compound upper-body exercise that targets the upper portion of the pectoral muscles (clavicular head of the pectoralis major). It’s performed on a Smith machine, which provides a fixed bar path for added stability and safety. This setup allows you to focus on muscle activation and form without worrying about balance, making it ideal for controlled strength and hypertrophy training.', '1. Setup\n\nAdjust the bench to a 30–45° incline and position it under the Smith machine bar.\n\nSit and lie back on the bench with your eyes directly under the bar.\n\nGrip the bar slightly wider than shoulder-width with an overhand grip.\n\nKeep your feet flat on the floor, chest up, and shoulder blades retracted.\n\n2. Execution\n\nUnrack the bar by rotating your wrists to release the hooks.\n\nInhale and slowly lower the bar to your upper chest (just below the collarbone).\n\nExhale and press the bar upward until your arms are fully extended.\n\nPause briefly at the top, then repeat the motion with control.\n\n3. Form Tips\n\nKeep your core engaged and back flat against the bench.\n\nDon’t bounce the bar off your chest — maintain a slow, controlled tempo.\n\nAdjust the incline angle to change emphasis (lower incline = mid chest, higher incline = shoulders).\n\nMake sure the bar path aligns with your upper chest, not your neck.', 'Focuses on the upper chest for complete pectoral development.\n\nProvides stability and safety, ideal for beginners or heavy lifters.\n\nAllows greater isolation of the chest and triceps due to guided movement.\n\nReduces stress on shoulders and joints compared to free weights.\n\nExcellent for hypertrophy (muscle growth) and controlled time under tension.', 'https://api.cnergy.site/image-servers.php?image=6925d8eea4a3b_1764088046.jpg', ''),
(68, 'Incline Shoulder Press (Smith Machine)', 'The incline shoulder press on a Smith machine is a resistance exercise targeting the shoulders, primarily the deltoids, while providing stability due to the guided bar path of the Smith machine. Adjusting the bench to an incline shifts emphasis slightly towards the upper part of the chest and front deltoids, making it a hybrid shoulder/chest movement.', 'Set a bench at a 30–45° incline under the Smith machine.\n\nSit down with your back against the bench, feet flat on the floor.\n\nGrip the Smith machine bar slightly wider than shoulder-width.\n\nUnrack the bar and position it at shoulder level.\n\nPress the bar upward until your arms are fully extended, without locking your elbows.\n\nSlowly lower the bar back to shoulder level.\n\nRepeat for the desired reps.', 'Builds overall shoulder strength and size.\n\nEngages stabilizing muscles without the balance requirement of free weights.\n\nReduces risk of injury compared to free barbell presses due to guided movement.\n\nImproves upper-body pressing power, which can enhance performance in other lifts.', 'https://api.cnergy.site/image-servers.php?image=6925e3b839460_1764090808.jpg', ''),
(69, 'Straight Hammer Curls', 'The Straight Hammer Curl is a variation of the traditional bicep curl performed with dumbbells using a neutral grip (palms facing each other). It primarily targets the brachialis and brachioradialis muscles, which lie underneath and beside the biceps, helping to build thicker and stronger arms.', '1. Starting Position:\n\nStand upright with your feet shoulder-width apart.\n\nHold a pair of dumbbells at your sides with your palms facing each other (neutral grip).\n\nKeep your elbows close to your torso and your core tight.\n\n2. Curl Movement:\n\nWhile keeping your upper arms stationary, curl the dumbbells upward by contracting your biceps and forearms.\n\nBring the dumbbells up until they reach shoulder height.\n\n3. Lowering Phase:\n\nSlowly lower the dumbbells back to the starting position under control.\n\nMaintain tension on your arms throughout the movement.', '', 'https://api.cnergy.site/image-servers.php?image=6925cf0c60078_1764085516.jpg', 'https://api.cnergy.site/image-servers.php?image=68ff6b83d0207_1761569667.mp4'),
(70, 'Incline Dumbbell Shoulder Press', 'The incline dumbbell shoulder press is a variation of the traditional shoulder press performed on an inclined bench. By setting the bench at a 30–45° angle, this exercise emphasizes the anterior (front) deltoids while still engaging the lateral delts and upper chest to a lesser degree. Using dumbbells allows for a greater range of motion and independent movement of each arm, improving shoulder stability.', '1. Set an adjustable bench to a 30–45° incline.\n\n2. Sit on the bench with your back firmly pressed against it and feet flat on the floor.\n\n3. Hold a dumbbell in each hand at shoulder height, palms facing forward or slightly turned in.\n\n4. Brace your core and press the dumbbells upward until your arms are fully extended overhead.\n\n5. Slowly lower the dumbbells back to shoulder height under control.\n\n6. Repeat for the desired number of reps.', 'Builds size and strength in the shoulders, especially the anterior deltoids.\n\nImproves shoulder stability and mobility.\n\nReduces imbalances since each arm works independently.\n\nEnhances upper chest activation slightly due to the incline angle.\n\nCan improve pressing strength for other lifts like bench press or overhead press.', 'https://api.cnergy.site/image-servers.php?image=6925e29795ba3_1764090519.jpg', 'https://api.cnergy.site/image-servers.php?image=68ff935c9c568_1761579868.mp4'),
(71, 'Flat Dumbbell Bench Press', 'The flat dumbbell bench press is a compound upper-body exercise that targets the chest, shoulders, and triceps. Performed on a flat bench using dumbbells, it allows for a greater range of motion and independent arm movement compared to the barbell version. This exercise enhances muscular balance, stability, and chest development.', '1. Lie flat on a bench with your feet firmly planted on the floor.\n\n2. Hold a dumbbell in each hand, resting them on your thighs.\n\n3. Kick the dumbbells up as you lie back, positioning them at chest level with palms facing forward.\n\n4. Engage your core and press the dumbbells upward until your arms are fully extended above your chest.\n\n5. Slowly lower the dumbbells back down to chest level under control.\n\n6. Repeat for the desired number of repetitions.', 'Builds overall chest mass and strength.\n\nIncreases range of motion compared to barbell presses.\n\nImproves muscle symmetry and balance between left and right sides.\n\nStrengthens triceps and anterior deltoids as secondary movers.\n\nEnhances functional pushing strength and shoulder stability.', 'https://api.cnergy.site/image-servers.php?image=6925d73fd60c7_1764087615.jpg', 'https://api.cnergy.site/image-servers.php?image=68ff96a116efb_1761580705.mp4'),
(73, 'Bicep Curl Dumbbell', 'The dumbbell bicep curl is an isolation exercise that targets the biceps brachii, the primary muscle responsible for flexing the elbow. Using dumbbells allows each arm to work independently, helping to correct strength imbalances and improve muscle symmetry. It can be performed standing or seated, with palms facing forward throughout the movement.', '1. Stand upright (or sit on a bench) with a dumbbell in each hand, arms fully extended by your sides.\n\n2. Keep your palms facing forward and elbows close to your torso.\n\n3. Curl the dumbbells upward by flexing your elbows, lifting until the dumbbells reach shoulder level.\n\n4. Squeeze your biceps at the top of the movement.\n\n5. Slowly lower the dumbbells back down to the starting position in a controlled manner.\n\n6. Repeat for the desired number of repetitions.', 'Builds size and strength in the biceps.\n\nImproves arm aesthetics and muscle definition.\n\nEnhances grip strength and elbow stability.\n\nHelps correct muscle imbalances between arms.\n\nStrengthens the muscles used in daily pulling and lifting motions.', 'https://api.cnergy.site/image-servers.php?image=6925c01e2ef4c_1764081694.jpg', 'https://api.cnergy.site/image-servers.php?image=68ff98b9b01cb_1761581241.mp4');

-- --------------------------------------------------------

--
-- Table structure for table `exercise_target_muscle`
--

CREATE TABLE `exercise_target_muscle` (
  `id` int(11) NOT NULL,
  `exercise_id` int(11) DEFAULT NULL,
  `muscle_id` int(11) DEFAULT NULL,
  `role` enum('primary','secondary','stabilizer') DEFAULT 'primary'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `exercise_target_muscle`
--

INSERT INTO `exercise_target_muscle` (`id`, `exercise_id`, `muscle_id`, `role`) VALUES
(737, 14, 13, 'primary'),
(738, 14, 71, 'primary'),
(739, 14, 83, 'secondary'),
(748, 28, 80, 'primary'),
(749, 28, 82, 'primary'),
(750, 28, 89, 'secondary'),
(751, 28, 84, 'stabilizer'),
(752, 19, 81, 'primary'),
(753, 19, 85, 'primary'),
(754, 19, 87, 'secondary'),
(755, 19, 86, 'secondary'),
(756, 19, 90, 'stabilizer'),
(765, 50, 80, 'primary'),
(766, 50, 82, 'primary'),
(767, 50, 89, 'secondary'),
(768, 50, 84, 'stabilizer'),
(782, 22, 81, 'primary'),
(783, 22, 85, 'primary'),
(784, 22, 87, 'secondary'),
(785, 22, 86, 'secondary'),
(786, 22, 88, 'stabilizer'),
(787, 22, 91, 'stabilizer'),
(792, 17, 13, 'primary'),
(793, 17, 71, 'primary'),
(794, 17, 84, 'secondary'),
(795, 17, 77, 'secondary'),
(796, 17, 72, 'secondary'),
(797, 17, 82, 'stabilizer'),
(798, 17, 91, 'stabilizer'),
(833, 51, 80, 'primary'),
(834, 51, 82, 'primary'),
(835, 51, 89, 'secondary'),
(836, 51, 84, 'stabilizer'),
(852, 42, 14, 'primary'),
(853, 42, 76, 'primary'),
(854, 42, 75, 'secondary'),
(855, 42, 79, 'secondary'),
(871, 15, 13, 'primary'),
(872, 15, 70, 'primary'),
(873, 15, 77, 'secondary'),
(874, 15, 83, 'secondary'),
(875, 15, 90, 'stabilizer'),
(876, 15, 84, 'stabilizer'),
(930, 73, 80, 'primary'),
(931, 73, 82, 'primary'),
(932, 73, 89, 'secondary'),
(937, 29, 80, 'primary'),
(938, 29, 82, 'primary'),
(939, 29, 89, 'secondary'),
(940, 29, 84, 'secondary'),
(941, 45, 80, 'primary'),
(942, 45, 83, 'primary'),
(943, 45, 89, 'secondary'),
(944, 45, 84, 'secondary'),
(945, 48, 80, 'primary'),
(946, 48, 82, 'primary'),
(947, 48, 89, 'secondary'),
(948, 49, 80, 'primary'),
(949, 49, 82, 'primary'),
(950, 49, 89, 'secondary'),
(951, 49, 84, 'secondary'),
(952, 57, 80, 'primary'),
(953, 57, 83, 'primary'),
(954, 57, 77, 'secondary'),
(955, 57, 90, 'stabilizer'),
(962, 55, 80, 'primary'),
(963, 55, 83, 'primary'),
(964, 55, 73, 'secondary'),
(969, 56, 80, 'primary'),
(970, 56, 84, 'primary'),
(971, 56, 83, 'primary'),
(972, 56, 90, 'stabilizer'),
(973, 58, 80, 'primary'),
(974, 58, 83, 'primary'),
(975, 58, 73, 'stabilizer'),
(976, 46, 80, 'primary'),
(977, 46, 83, 'primary'),
(978, 46, 90, 'stabilizer'),
(979, 47, 80, 'primary'),
(980, 47, 84, 'primary'),
(981, 47, 82, 'secondary'),
(982, 53, 80, 'primary'),
(983, 53, 82, 'primary'),
(984, 53, 89, 'secondary'),
(985, 53, 84, 'secondary'),
(989, 40, 80, 'primary'),
(990, 40, 89, 'primary'),
(991, 40, 82, 'secondary'),
(992, 52, 80, 'primary'),
(993, 52, 82, 'primary'),
(994, 52, 89, 'secondary'),
(995, 52, 84, 'secondary'),
(999, 54, 80, 'primary'),
(1000, 54, 83, 'primary'),
(1001, 54, 84, 'secondary'),
(1002, 69, 80, 'primary'),
(1003, 69, 82, 'primary'),
(1004, 69, 89, 'primary'),
(1005, 69, 84, 'secondary'),
(1010, 44, 80, 'primary'),
(1011, 44, 83, 'primary'),
(1012, 44, 89, 'secondary'),
(1013, 44, 84, 'secondary'),
(1024, 62, 14, 'primary'),
(1025, 62, 76, 'primary'),
(1026, 62, 82, 'secondary'),
(1027, 62, 84, 'secondary'),
(1028, 62, 75, 'stabilizer'),
(1033, 32, 14, 'primary'),
(1034, 32, 85, 'primary'),
(1035, 32, 87, 'secondary'),
(1036, 32, 86, 'secondary'),
(1037, 41, 14, 'primary'),
(1038, 41, 74, 'primary'),
(1039, 41, 82, 'secondary'),
(1040, 41, 89, 'secondary'),
(1041, 41, 76, 'secondary'),
(1047, 23, 14, 'primary'),
(1048, 23, 74, 'primary'),
(1049, 23, 82, 'secondary'),
(1050, 23, 76, 'secondary'),
(1051, 23, 75, 'secondary'),
(1052, 24, 14, 'primary'),
(1053, 24, 76, 'primary'),
(1054, 24, 75, 'primary'),
(1055, 24, 74, 'secondary'),
(1056, 16, 13, 'primary'),
(1057, 16, 71, 'primary'),
(1058, 16, 90, 'stabilizer'),
(1059, 16, 75, 'stabilizer'),
(1060, 71, 13, 'primary'),
(1061, 71, 71, 'primary'),
(1062, 71, 77, 'secondary'),
(1063, 71, 72, 'secondary'),
(1064, 71, 83, 'secondary'),
(1075, 66, 13, 'primary'),
(1076, 66, 70, 'primary'),
(1077, 66, 82, 'secondary'),
(1078, 66, 77, 'secondary'),
(1079, 66, 83, 'secondary'),
(1080, 67, 13, 'primary'),
(1081, 67, 77, 'primary'),
(1082, 67, 82, 'secondary'),
(1083, 67, 83, 'secondary'),
(1084, 63, 29, 'primary'),
(1085, 63, 90, 'primary'),
(1086, 63, 76, 'secondary'),
(1095, 60, 81, 'primary'),
(1096, 60, 87, 'primary'),
(1097, 60, 86, 'secondary'),
(1098, 60, 91, 'secondary'),
(1099, 36, 81, 'primary'),
(1100, 36, 87, 'primary'),
(1101, 36, 86, 'secondary'),
(1102, 36, 85, 'secondary'),
(1103, 59, 81, 'primary'),
(1104, 59, 85, 'primary'),
(1105, 59, 88, 'secondary'),
(1106, 59, 87, 'secondary'),
(1107, 59, 86, 'secondary'),
(1108, 59, 91, 'stabilizer'),
(1109, 35, 81, 'primary'),
(1110, 35, 87, 'primary'),
(1111, 35, 86, 'secondary'),
(1112, 35, 85, 'secondary'),
(1113, 65, 81, 'primary'),
(1114, 65, 87, 'primary'),
(1115, 65, 86, 'secondary'),
(1116, 65, 75, 'secondary'),
(1117, 65, 91, 'secondary'),
(1118, 65, 85, 'secondary'),
(1119, 34, 81, 'primary'),
(1120, 34, 86, 'primary'),
(1121, 34, 88, 'secondary'),
(1122, 43, 81, 'primary'),
(1123, 43, 85, 'primary'),
(1124, 43, 86, 'secondary'),
(1125, 20, 81, 'primary'),
(1126, 20, 85, 'primary'),
(1127, 20, 86, 'secondary'),
(1128, 20, 87, 'stabilizer'),
(1129, 33, 81, 'primary'),
(1130, 33, 87, 'primary'),
(1131, 33, 75, 'secondary'),
(1132, 33, 85, 'secondary'),
(1133, 33, 86, 'stabilizer'),
(1134, 38, 81, 'primary'),
(1135, 38, 88, 'primary'),
(1136, 21, 81, 'primary'),
(1137, 21, 85, 'primary'),
(1138, 21, 88, 'secondary'),
(1139, 21, 86, 'secondary'),
(1140, 21, 90, 'stabilizer'),
(1141, 37, 81, 'primary'),
(1142, 37, 88, 'primary'),
(1143, 61, 81, 'primary'),
(1144, 61, 85, 'primary'),
(1145, 61, 84, 'secondary'),
(1146, 61, 87, 'secondary'),
(1147, 61, 86, 'secondary'),
(1148, 61, 75, 'stabilizer'),
(1155, 70, 15, 'primary'),
(1156, 70, 77, 'primary'),
(1157, 70, 83, 'secondary'),
(1166, 68, 15, 'primary'),
(1167, 68, 77, 'primary'),
(1168, 68, 78, 'secondary'),
(1169, 68, 83, 'secondary'),
(1170, 26, 15, 'primary'),
(1171, 26, 78, 'primary'),
(1172, 26, 77, 'secondary'),
(1173, 26, 79, 'secondary'),
(1174, 18, 13, 'primary'),
(1175, 18, 70, 'primary'),
(1176, 18, 77, 'secondary'),
(1177, 18, 71, 'secondary'),
(1178, 27, 15, 'primary'),
(1179, 27, 79, 'primary'),
(1180, 27, 78, 'secondary'),
(1181, 25, 14, 'primary'),
(1182, 25, 73, 'primary'),
(1183, 25, 89, 'secondary'),
(1184, 25, 84, 'secondary'),
(1185, 25, 76, 'secondary'),
(1186, 25, 74, 'secondary'),
(1187, 30, 83, 'primary'),
(1188, 30, 77, 'secondary'),
(1189, 30, 72, 'secondary'),
(1190, 30, 91, 'stabilizer'),
(1191, 30, 73, 'stabilizer'),
(1192, 39, 80, 'primary'),
(1193, 39, 84, 'primary'),
(1194, 39, 89, 'stabilizer'),
(1195, 64, 81, 'primary'),
(1196, 64, 85, 'primary'),
(1197, 64, 90, 'secondary'),
(1198, 64, 88, 'secondary'),
(1199, 64, 86, 'secondary'),
(1200, 64, 91, 'secondary');

-- --------------------------------------------------------

--
-- Table structure for table `explore_program_workout`
--

CREATE TABLE `explore_program_workout` (
  `id` int(11) NOT NULL,
  `program_id` int(11) DEFAULT NULL,
  `details` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `explore_program_workout`
--

INSERT INTO `explore_program_workout` (`id`, `program_id`, `details`) VALUES
(4, 3, '{\"exercise_id\":\"19\",\"exercise_name\":\"Barbell squat\",\"weight\":\"\",\"reps\":\"\",\"sets\":\"\",\"color\":\"#3B82F6\"}'),
(5, 3, '{\"exercise_id\":\"28\",\"exercise_name\":\"Barbell Curl\",\"weight\":\"\",\"reps\":\"\",\"sets\":\"\",\"color\":\"#3B82F6\"}'),
(6, 3, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":\"\",\"reps\":\"\",\"sets\":\"\",\"color\":\"#3B82F6\"}'),
(7, 4, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":\"\",\"reps\":\"\",\"sets\":\"3\",\"color\":\"#3B82F6\"}'),
(8, 4, '{\"exercise_id\":\"28\",\"exercise_name\":\"Barbell Curl\",\"weight\":\"\",\"reps\":\"\",\"sets\":\"\",\"color\":\"#3B82F6\"}'),
(9, 4, '{\"exercise_id\":\"50\",\"exercise_name\":\"Bayesian Curl\",\"weight\":\"\",\"reps\":\"\",\"sets\":\"3\",\"color\":\"#3B82F6\"}'),
(10, 5, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":\"100\",\"reps\":\"\",\"sets\":\"3\",\"color\":\"#3B82F6\"}'),
(12, 7, '{\"exercise_id\":\"16\",\"exercise_name\":\"Chest Fly Machine\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"color\":\"#3B82F6\"}'),
(13, 7, '{\"exercise_id\":\"15\",\"exercise_name\":\"Incline Dumbbell Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"color\":\"#3B82F6\"}'),
(14, 7, '{\"exercise_id\":\"68\",\"exercise_name\":\"Incline Shoulder Press (Smith Machine):\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"color\":\"#3B82F6\"}'),
(15, 7, '{\"exercise_id\":\"26\",\"exercise_name\":\"Lateral Raise\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"color\":\"#3B82F6\"}'),
(16, 7, '{\"exercise_id\":\"44\",\"exercise_name\":\"Triceps Cable Pushdown\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"color\":\"#3B82F6\"}'),
(17, 8, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(23, 9, '{\"exercise_id\":\"15\",\"exercise_name\":\"Incline Dumbbell Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"repsPerSet\":[\"15\",\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(24, 9, '{\"exercise_id\":\"16\",\"exercise_name\":\"Chest Fly Machine\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"repsPerSet\":[\"15\",\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(25, 9, '{\"exercise_id\":\"70\",\"exercise_name\":\"Incline Dumbbell Shoulder Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"15\"],\"color\":\"#3B82F6\"}'),
(26, 9, '{\"exercise_id\":\"26\",\"exercise_name\":\"Lateral Raise\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"repsPerSet\":[\"15\",\"15\",\"15\"],\"color\":\"#3B82F6\"}'),
(27, 9, '{\"exercise_id\":\"45\",\"exercise_name\":\"Cable Triceps Extension\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"repsPerSet\":[\"15\",\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(28, 1, '{\"exercise_id\":\"16\",\"exercise_name\":\"Chest Fly Machine\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(29, 1, '{\"exercise_id\":\"15\",\"exercise_name\":\"Incline Dumbbell Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(30, 1, '{\"exercise_id\":\"70\",\"exercise_name\":\"Incline Dumbbell Shoulder Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"10\"],\"color\":\"#3B82F6\"}'),
(31, 1, '{\"exercise_id\":\"26\",\"exercise_name\":\"Lateral Raise\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(32, 1, '{\"exercise_id\":\"54\",\"exercise_name\":\"Rope Triceps Pushdown\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(33, NULL, '{\"exercise_id\":\"23\",\"exercise_name\":\"Lat Pulldown\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(34, NULL, '{\"exercise_id\":\"62\",\"exercise_name\":\"Bent-Over Barbell Row\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"10\"],\"color\":\"#3B82F6\"}'),
(35, NULL, '{\"exercise_id\":\"73\",\"exercise_name\":\"Bicep Curl Dumbbell\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"10\"],\"color\":\"#3B82F6\"}'),
(36, NULL, '{\"exercise_id\":\"49\",\"exercise_name\":\"Cross-Body Hammer Curl\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"10\"],\"color\":\"#3B82F6\"}'),
(37, NULL, '{\"exercise_id\":\"27\",\"exercise_name\":\"Rear Delt Fly\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(38, 3, '{\"exercise_id\":\"19\",\"exercise_name\":\"Barbell squat\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"10\",\"10\"],\"color\":\"#3B82F6\"}'),
(39, 3, '{\"exercise_id\":\"43\",\"exercise_name\":\"Leg Extension\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(40, 3, '{\"exercise_id\":\"33\",\"exercise_name\":\"Romanian Deadlift\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(41, 3, '{\"exercise_id\":\"38\",\"exercise_name\":\"Seated Calf Raise\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(42, 3, '{\"exercise_id\":\"35\",\"exercise_name\":\"Hip Thrust\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"10\"],\"color\":\"#3B82F6\"}'),
(43, 1, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"5\",\"5\"],\"color\":\"#3B82F6\"}'),
(44, NULL, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"5\",\"5\"],\"color\":\"#3B82F6\"}'),
(45, 3, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":null,\"reps\":\"10\",\"sets\":\"1\",\"repsPerSet\":[],\"color\":\"#3B82F6\"}'),
(46, 4, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"10\",\"10\"],\"color\":\"#3B82F6\"}'),
(47, 5, '{\"exercise_id\":\"57\",\"exercise_name\":\"Dumbbell Close Grip Bench Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"10\"],\"color\":\"#3B82F6\"}'),
(49, 7, '{\"exercise_id\":\"62\",\"exercise_name\":\"Bent Over Barbell Row\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"13\",\"15\"],\"color\":\"#3B82F6\"}'),
(50, 8, '{\"exercise_id\":\"19\",\"exercise_name\":\"Barbell squat\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"2\",\"12\"],\"color\":\"#3B82F6\"}'),
(51, 9, '{\"exercise_id\":\"50\",\"exercise_name\":\"Bayesian Curl\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"15\"],\"color\":\"#3B82F6\"}'),
(52, 10, '{\"exercise_id\":\"19\",\"exercise_name\":\"Barbell squat\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"3\",\"3\"],\"color\":\"#3B82F6\"}'),
(54, 11, '{\"exercise_id\":\"17\",\"exercise_name\":\"Cable Crossover\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(55, 11, '{\"exercise_id\":\"28\",\"exercise_name\":\"Barbell Curl\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"15\"],\"color\":\"#3B82F6\"}'),
(56, 12, '{\"exercise_id\":\"62\",\"exercise_name\":\"Bent Over Barbell Row\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"repsPerSet\":[\"15\",\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(57, 13, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"5\",\"repsPerSet\":[\"12\",\"12\",\"21\",\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(58, 14, '{\"exercise_id\":\"50\",\"exercise_name\":\"Bayesian Curl\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"2\",\"2\"],\"color\":\"#3B82F6\"}'),
(59, 15, '{\"exercise_id\":\"32\",\"exercise_name\":\"Deadlift\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"21\"],\"color\":\"#3B82F6\"}'),
(60, 16, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"21\"],\"color\":\"#3B82F6\"}'),
(61, 16, '{\"exercise_id\":\"28\",\"exercise_name\":\"Barbell Curl\",\"weight\":null,\"reps\":\"12\",\"sets\":\"1\",\"repsPerSet\":[],\"color\":\"#3B82F6\"}'),
(62, 16, '{\"exercise_id\":\"17\",\"exercise_name\":\"Cable Crossover\",\"weight\":null,\"reps\":\"12\",\"sets\":\"1\",\"repsPerSet\":[],\"color\":\"#3B82F6\"}'),
(63, 16, '{\"exercise_id\":\"73\",\"exercise_name\":\"Bicep Curl Dumbbell\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"repsPerSet\":[\"12\",\"12\",\"40\"],\"color\":\"#3B82F6\"}'),
(64, 17, '{\"exercise_id\":\"28\",\"exercise_name\":\"Barbell Curl\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"repsPerSet\":[\"13\",\"2\",\"10\"],\"color\":\"#3B82F6\"}'),
(65, 1, '{\"exercise_id\":\"16\",\"exercise_name\":\"Chest Fly Machine\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(66, 1, '{\"exercise_id\":\"15\",\"exercise_name\":\"Incline Dumbbell Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(67, 1, '{\"exercise_id\":\"70\",\"exercise_name\":\"Incline Dumbbell Shoulder Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(68, 1, '{\"exercise_id\":\"45\",\"exercise_name\":\"Cable Triceps Extension\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(69, 1, '{\"exercise_id\":\"26\",\"exercise_name\":\"Lateral Raise\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"repsPerSet\":[\"15\",\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(70, NULL, '{\"exercise_id\":\"14\",\"exercise_name\":\"Barbel Bench Press\",\"weight\":null,\"reps\":\"12\",\"sets\":\"1\",\"repsPerSet\":[],\"color\":\"#3B82F6\"}'),
(71, NULL, '{\"exercise_id\":\"16\",\"exercise_name\":\"Chest Fly Machine\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(72, 3, '{\"exercise_id\":\"23\",\"exercise_name\":\"Lat Pulldown\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(73, 3, '{\"exercise_id\":\"62\",\"exercise_name\":\"Bent Over Barbell Row\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(74, 3, '{\"exercise_id\":\"27\",\"exercise_name\":\"Rear Delt Fly\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(75, 3, '{\"exercise_id\":\"28\",\"exercise_name\":\"Barbell Curl\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(76, 3, '{\"exercise_id\":\"49\",\"exercise_name\":\"Cross Body Hammer Curl\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"10\"],\"color\":\"#3B82F6\"}'),
(77, 4, '{\"exercise_id\":\"19\",\"exercise_name\":\"Barbell squat\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"10\"],\"color\":\"#3B82F6\"}'),
(78, 4, '{\"exercise_id\":\"33\",\"exercise_name\":\"Romanian Deadlift\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(79, 4, '{\"exercise_id\":\"43\",\"exercise_name\":\"Leg Extension\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(80, 4, '{\"exercise_id\":\"38\",\"exercise_name\":\"Seated Calf Raise\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(81, 5, '{\"exercise_id\":\"28\",\"exercise_name\":\"Barbell Curl\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"repsPerSet\":[\"15\",\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(82, 5, '{\"exercise_id\":\"49\",\"exercise_name\":\"Cross Body Hammer Curl\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(83, 5, '{\"exercise_id\":\"45\",\"exercise_name\":\"Cable Triceps Extension\",\"weight\":null,\"reps\":\"\",\"sets\":\"3\",\"repsPerSet\":[\"15\",\"12\",\"10\"],\"color\":\"#3B82F6\"}'),
(84, 5, '{\"exercise_id\":\"56\",\"exercise_name\":\"Dumbbell Skull Crusher\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(89, 6, '{\"exercise_id\":\"16\",\"exercise_name\":\"Chest Fly Machine\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(90, 6, '{\"exercise_id\":\"66\",\"exercise_name\":\"Incline Barbell Press\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"12\",\"12\"],\"color\":\"#3B82F6\"}'),
(91, 6, '{\"exercise_id\":\"62\",\"exercise_name\":\"Bent Over Barbell Row\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"12\"],\"color\":\"#3B82F6\"}'),
(92, 6, '{\"exercise_id\":\"23\",\"exercise_name\":\"Lat Pulldown\",\"weight\":null,\"reps\":\"\",\"sets\":\"2\",\"repsPerSet\":[\"15\",\"15\"],\"color\":\"#3B82F6\"}');

-- --------------------------------------------------------

--
-- Table structure for table `gender`
--

CREATE TABLE `gender` (
  `id` int(11) NOT NULL,
  `gender_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `gender`
--

INSERT INTO `gender` (`id`, `gender_name`) VALUES
(1, 'male'),
(2, 'female');

-- --------------------------------------------------------

--
-- Table structure for table `guest_session`
--

CREATE TABLE `guest_session` (
  `id` int(11) NOT NULL,
  `guest_name` varchar(100) NOT NULL,
  `guest_type` enum('walkin','trial','guest') DEFAULT 'walkin',
  `amount_paid` decimal(10,2) NOT NULL,
  `qr_token` varchar(255) NOT NULL,
  `session_code` varchar(10) DEFAULT NULL COMMENT 'Unique code for users to retrieve their session (e.g., ABC123)',
  `valid_until` datetime NOT NULL,
  `checkout_time` datetime DEFAULT NULL,
  `paid` tinyint(1) DEFAULT 0,
  `status` enum('pending','pending_payment','approved','rejected','cancelled','expired') DEFAULT 'pending',
  `payment_link_id` varchar(255) DEFAULT NULL COMMENT 'PayMongo payment link ID for online payments',
  `reference_number` varchar(50) DEFAULT NULL COMMENT 'PayMongo payment reference number',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `payment_method` enum('cash','card','digital') DEFAULT 'cash',
  `receipt_number` varchar(50) DEFAULT NULL,
  `cashier_id` int(11) DEFAULT NULL,
  `change_given` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `guest_session`
--

INSERT INTO `guest_session` (`id`, `guest_name`, `guest_type`, `amount_paid`, `qr_token`, `session_code`, `valid_until`, `checkout_time`, `paid`, `status`, `payment_link_id`, `reference_number`, `created_at`, `payment_method`, `receipt_number`, `cashier_id`, `change_given`) VALUES
(1, 'Carl Mathnew', 'walkin', 150.00, 'GUEST_4D5701147519', 'QGS8YT', '2025-11-26 21:00:00', '2025-11-26 21:00:00', 1, 'approved', NULL, '20349810116478', '2025-11-26 03:17:44', 'digital', 'GST202511263417', NULL, 0.00),
(2, 'Edmarly', 'walkin', 150.00, 'GUEST_7A26B933B22B', '620SS5', '2025-11-26 21:00:00', '2025-11-26 21:00:00', 1, 'approved', NULL, NULL, '2025-11-26 03:20:12', 'cash', 'GST202511260098', NULL, 0.00),
(3, 'Simon', 'walkin', 150.00, 'GUEST_69F3736501AB', 'GQCNGJ', '2025-11-26 21:00:00', '2025-11-26 21:00:00', 1, 'approved', NULL, '2038847334261H', '2025-11-26 03:20:47', 'digital', 'GST202511263396', NULL, 0.00),
(4, 'Mel Macaryow', 'walkin', 150.00, 'GUEST_1CFE0C02F338', 'KTRU4X', '2025-11-26 21:00:00', '2025-11-26 21:00:00', 1, 'approved', 'link_CLnpyor3eaeGNF3xvoB5NXNh', 'DiFMTCj', '2025-11-26 03:29:22', 'digital', NULL, NULL, 0.00),
(5, 'nigger tan', 'walkin', 150.00, 'GUEST_B167C06EC391', 'PRRQXV', '2026-01-20 21:00:00', '2026-01-20 21:00:00', 1, 'approved', 'link_vbKfYFhfkxMHAjD6PvL5xNXm', 'GvdPLQD', '2026-01-20 07:52:27', 'digital', NULL, NULL, 0.00),
(6, 'john 3:16', 'walkin', 150.00, 'GUEST_46DA7B9709CD', 'P4UEWX', '2026-01-20 21:00:00', NULL, 0, 'pending_payment', 'link_ME5JskYmaQZ8RmLJTZW83Da2', 'V1ZFEAB', '2026-01-20 08:02:44', 'digital', NULL, NULL, 0.00),
(7, 'hiiii', 'walkin', 150.00, 'GUEST_0A205BA7F452', '45KXJB', '2026-01-20 21:00:00', '2026-01-20 21:00:00', 1, 'approved', 'link_RyEA7b6DcXj39XCd2D34PbTk', 'hqWNRyw', '2026-01-20 08:04:24', 'digital', NULL, NULL, 0.00),
(8, 'hrrr', 'walkin', 150.00, 'GUEST_CD1BE168DF0A', 'UKS8PA', '2026-01-20 21:00:00', NULL, 0, 'cancelled', NULL, NULL, '2026-01-20 08:10:55', 'cash', NULL, NULL, 0.00),
(9, 'ss', 'walkin', 150.00, 'GUEST_BD84678F6981', 'DU55VL', '2026-01-21 21:00:00', NULL, 0, 'pending', NULL, NULL, '2026-01-21 10:07:46', 'cash', NULL, NULL, 0.00),
(10, 'frf', 'walkin', 150.00, 'GUEST_D66216F29A77', 'K3XRRP', '2026-01-21 21:00:00', NULL, 0, 'pending_payment', 'link_evDiMW3wFwNAJr9RVBBYzig1', '4djGoMU', '2026-01-21 10:33:38', 'digital', NULL, NULL, 0.00),
(11, 'asd', 'walkin', 150.00, 'GUEST_7E8FFA051707', 'YEHNK6', '2026-01-23 21:00:00', NULL, 0, 'pending_payment', 'link_RqCmeLSgXTdxvwCJUZXmgQRP', 'KA5qkzV', '2026-01-23 12:17:05', 'digital', NULL, NULL, 0.00),
(12, 'francis', 'walkin', 150.00, 'GUEST_48521147AF15', 'A5JTZZ', '2026-01-25 21:00:00', NULL, 0, 'pending_payment', 'link_b914EpipTAmFnEtBYSxi7gdf', 'QafhTxK', '2026-01-25 09:27:36', 'digital', NULL, NULL, 0.00),
(13, 'hell nah', 'walkin', 150.00, 'GUEST_AACA02D844DB', 'K6ABN8', '2026-01-25 21:00:00', NULL, 0, 'pending_payment', 'link_QKQ2LL6yHbr9PRLLWSDFjga4', 'Hm5WSK7', '2026-01-25 09:33:01', 'digital', NULL, NULL, 0.00),
(14, 'JunJun', 'walkin', 150.00, 'GUEST_04C6A5221E6C', 'T6NAL3', '2026-01-27 21:00:00', '2026-01-27 21:00:00', 1, 'approved', NULL, NULL, '2026-01-26 18:25:14', 'cash', 'GST202601270851', NULL, 50.00),
(15, 'Remrem', 'walkin', 150.00, 'GUEST_7297A4C61922', 'CG41DZ', '2026-01-27 21:00:00', '2026-01-27 21:00:00', 1, 'approved', NULL, NULL, '2026-01-26 18:25:40', 'cash', 'GST202601271244', NULL, 50.00);

-- --------------------------------------------------------

--
-- Table structure for table `membership`
--

CREATE TABLE `membership` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `amount_paid` decimal(10,2) DEFAULT 500.00,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `member_achievements`
--

CREATE TABLE `member_achievements` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `achievement_id` int(11) NOT NULL,
  `awarded_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `member_achievements`
--

INSERT INTO `member_achievements` (`id`, `user_id`, `achievement_id`, `awarded_at`) VALUES
(56, 15, 1, '2025-11-25 18:50:51'),
(57, 15, 10, '2025-11-25 18:50:51'),
(58, 15, 31, '2025-11-25 18:50:51'),
(59, 4, 1, '2025-11-26 03:11:56'),
(60, 4, 4, '2025-11-26 03:11:56'),
(61, 4, 5, '2025-11-26 03:11:56'),
(62, 4, 6, '2025-11-26 03:11:56'),
(63, 4, 10, '2025-11-26 03:11:56'),
(64, 4, 43, '2025-11-26 03:11:56'),
(65, 4, 31, '2025-11-26 03:24:05'),
(66, 11, 1, '2026-01-26 17:57:45'),
(67, 11, 4, '2026-01-26 17:57:45'),
(68, 11, 10, '2026-01-26 17:57:45'),
(69, 11, 27, '2026-01-26 17:57:45'),
(70, 11, 31, '2026-01-26 17:57:45');

--
-- Triggers `member_achievements`
--
DELIMITER $$
CREATE TRIGGER `notify_achievement_unlocked` AFTER INSERT ON `member_achievements` FOR EACH ROW BEGIN
    
    SET @achievement_title = (SELECT title FROM achievements WHERE id = NEW.achievement_id);
    
    
    INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
    VALUES (NEW.user_id, CONCAT('?? Achievement Unlocked: ', @achievement_title), 1, 3, NOW());
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `member_exercise_log`
--

CREATE TABLE `member_exercise_log` (
  `id` int(11) NOT NULL,
  `member_id` int(11) DEFAULT NULL,
  `member_workout_exercise_id` int(11) DEFAULT NULL,
  `actual_sets` int(11) DEFAULT NULL,
  `actual_reps` int(11) DEFAULT NULL,
  `total_kg` decimal(6,2) DEFAULT NULL,
  `log_date` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `member_exercise_log`
--

INSERT INTO `member_exercise_log` (`id`, `member_id`, `member_workout_exercise_id`, `actual_sets`, `actual_reps`, `total_kg`, `log_date`) VALUES
(1, 11, 19, 2, 23, 500.00, '2025-11-26'),
(2, 11, 20, 2, 30, 1260.00, '2025-11-26'),
(3, 11, 21, 2, 10, 200.00, '2025-11-26'),
(4, 11, 22, 2, 15, 300.00, '2025-11-26'),
(5, 11, 23, 3, 0, 0.00, '2025-11-26'),
(6, 11, 24, 3, 30, 1825.00, '2025-11-26'),
(7, 11, 19, 40, 460, 9999.99, '2026-01-25'),
(8, 11, 20, 20, 300, 9999.99, '2026-01-25'),
(9, 11, 19, 11, 130, 2800.00, '2026-01-26'),
(10, 11, 20, 10, 150, 6300.00, '2026-01-26');

--
-- Triggers `member_exercise_log`
--
DELIMITER $$
CREATE TRIGGER `notify_workout_completed` AFTER INSERT ON `member_exercise_log` FOR EACH ROW BEGIN
    INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
    VALUES (
        NEW.member_id, 
        '?️ Great job! You completed your workout. Keep up the momentum!',
        1, 
        9, 
        NOW()
    );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_workout_streak` AFTER INSERT ON `member_exercise_log` FOR EACH ROW BEGIN
    DECLARE streak_count INT DEFAULT 0;
    
    -- Count consecutive workout days
    SELECT COUNT(DISTINCT DATE(log_date)) INTO streak_count
    FROM member_exercise_log 
    WHERE member_id = NEW.member_id 
    AND log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    AND log_date <= CURDATE();
    
    -- Notify for 7-day streak
    IF streak_count = 7 THEN
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.member_id, 
            '? 7-Day Workout Streak! You''re on fire! Keep it up!',
            1, 
            6, 
            NOW()
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `member_exercise_set_log`
--

CREATE TABLE `member_exercise_set_log` (
  `id` int(11) NOT NULL,
  `exercise_log_id` int(11) DEFAULT NULL,
  `set_number` int(11) NOT NULL,
  `reps` int(11) NOT NULL,
  `weight` decimal(5,2) NOT NULL,
  `rpe` tinyint(4) DEFAULT NULL,
  `rest_time` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `member_exercise_set_log`
--

INSERT INTO `member_exercise_set_log` (`id`, `exercise_log_id`, `set_number`, `reps`, `weight`, `rpe`, `rest_time`, `notes`, `created_at`) VALUES
(1, 1, 1, 15, 20.00, 0, NULL, '', '2025-11-26 05:36:43'),
(2, 1, 2, 8, 25.00, 0, NULL, '', '2025-11-26 05:36:43'),
(3, 2, 1, 18, 40.00, 0, NULL, '', '2025-11-26 05:36:43'),
(4, 2, 2, 12, 45.00, 0, NULL, '', '2025-11-26 05:36:43'),
(5, 3, 1, 5, 20.00, 0, NULL, '', '2025-11-26 05:36:43'),
(6, 3, 2, 5, 20.00, 0, NULL, '', '2025-11-26 05:36:43'),
(7, 4, 1, 10, 20.00, 0, NULL, '', '2025-11-26 05:36:43'),
(8, 4, 2, 5, 20.00, 0, NULL, '', '2025-11-26 05:36:43'),
(9, 5, 1, 0, 10.00, 0, NULL, '', '2025-11-26 05:36:43'),
(10, 5, 2, 0, 10.00, 0, NULL, '', '2025-11-26 05:36:43'),
(11, 5, 3, 0, 10.00, 0, NULL, '', '2025-11-26 05:36:43'),
(12, 6, 1, 5, 50.00, 0, NULL, '', '2025-11-26 05:53:17'),
(13, 6, 2, 10, 60.00, 0, NULL, '', '2025-11-26 05:53:17'),
(14, 6, 3, 15, 65.00, 0, NULL, '', '2025-11-26 05:53:17'),
(15, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 10:38:01'),
(16, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 10:38:01'),
(17, 8, 1, 18, 40.00, 0, NULL, '', '2026-01-25 10:38:01'),
(18, 8, 2, 12, 45.00, 0, NULL, '', '2026-01-25 10:38:01'),
(19, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 10:38:29'),
(20, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 10:38:29'),
(21, 8, 1, 18, 40.00, 0, NULL, '', '2026-01-25 10:38:29'),
(22, 8, 2, 12, 45.00, 0, NULL, '', '2026-01-25 10:38:29'),
(23, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 10:40:53'),
(24, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 10:40:53'),
(25, 8, 1, 18, 40.00, 0, NULL, '', '2026-01-25 10:40:53'),
(26, 8, 2, 12, 45.00, 0, NULL, '', '2026-01-25 10:40:53'),
(27, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 10:43:30'),
(28, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 10:43:30'),
(29, 8, 1, 18, 40.00, 0, NULL, '', '2026-01-25 10:43:30'),
(30, 8, 2, 12, 45.00, 0, NULL, '', '2026-01-25 10:43:30'),
(31, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:10:08'),
(32, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:10:08'),
(33, 8, 1, 18, 40.00, 0, NULL, '', '2026-01-25 11:10:08'),
(34, 8, 2, 12, 45.00, 0, NULL, '', '2026-01-25 11:10:08'),
(35, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:12:11'),
(36, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:12:11'),
(37, 8, 1, 18, 40.00, 0, NULL, '', '2026-01-25 11:12:11'),
(38, 8, 2, 12, 45.00, 0, NULL, '', '2026-01-25 11:12:11'),
(39, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:13:06'),
(40, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:13:06'),
(41, 8, 1, 18, 40.00, 0, NULL, '', '2026-01-25 11:13:06'),
(42, 8, 2, 12, 45.00, 0, NULL, '', '2026-01-25 11:13:06'),
(43, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:13:17'),
(44, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:13:17'),
(45, 8, 1, 18, 40.00, 0, NULL, '', '2026-01-25 11:13:17'),
(46, 8, 2, 12, 45.00, 0, NULL, '', '2026-01-25 11:13:17'),
(47, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:14:38'),
(48, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:14:38'),
(49, 8, 1, 18, 40.00, 0, NULL, '', '2026-01-25 11:14:38'),
(50, 8, 2, 12, 45.00, 0, NULL, '', '2026-01-25 11:14:38'),
(51, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:17:26'),
(52, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:17:26'),
(53, 8, 1, 18, 40.00, 0, NULL, '', '2026-01-25 11:17:26'),
(54, 8, 2, 12, 45.00, 0, NULL, '', '2026-01-25 11:17:26'),
(55, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:18:48'),
(56, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:18:48'),
(57, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:34:09'),
(58, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:34:09'),
(59, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:34:45'),
(60, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:34:45'),
(61, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:36:05'),
(62, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:36:05'),
(63, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:37:52'),
(64, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:37:52'),
(65, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:38:50'),
(66, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:38:50'),
(67, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:42:39'),
(68, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:42:39'),
(69, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:42:45'),
(70, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:42:45'),
(71, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:43:03'),
(72, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:43:03'),
(73, 7, 1, 15, 20.00, 0, NULL, '', '2026-01-25 11:43:48'),
(74, 7, 2, 8, 25.00, 0, NULL, '', '2026-01-25 11:43:48'),
(75, 9, 1, 15, 20.00, 0, NULL, '', '2026-01-26 17:46:42'),
(76, 9, 2, 8, 25.00, 0, NULL, '', '2026-01-26 17:46:42'),
(77, 10, 1, 18, 40.00, 0, NULL, '', '2026-01-26 17:46:42'),
(78, 10, 2, 12, 45.00, 0, NULL, '', '2026-01-26 17:46:42'),
(79, 9, 1, 15, 20.00, 0, NULL, '', '2026-01-26 17:46:49'),
(80, 9, 2, 8, 25.00, 0, NULL, '', '2026-01-26 17:46:49'),
(81, 10, 1, 18, 40.00, 0, NULL, '', '2026-01-26 17:46:49'),
(82, 10, 2, 12, 45.00, 0, NULL, '', '2026-01-26 17:46:49'),
(83, 9, 1, 15, 20.00, 0, NULL, '', '2026-01-26 17:48:49'),
(84, 9, 2, 8, 25.00, 0, NULL, '', '2026-01-26 17:48:49'),
(85, 9, 1, 15, 20.00, 0, NULL, '', '2026-01-26 17:52:40'),
(86, 9, 2, 8, 25.00, 0, NULL, '', '2026-01-26 17:52:40'),
(87, 10, 1, 18, 40.00, 0, NULL, '', '2026-01-26 17:52:40'),
(88, 10, 2, 12, 45.00, 0, NULL, '', '2026-01-26 17:52:40'),
(89, 9, 1, 15, 20.00, 0, NULL, '', '2026-01-26 17:53:57'),
(90, 9, 2, 8, 25.00, 0, NULL, '', '2026-01-26 17:53:57'),
(91, 10, 1, 18, 40.00, 0, NULL, '', '2026-01-26 17:53:57'),
(92, 10, 2, 12, 45.00, 0, NULL, '', '2026-01-26 17:53:57'),
(93, 9, 1, 15, 20.00, 0, NULL, '', '2026-01-26 17:59:01'),
(94, 10, 1, 18, 40.00, 0, NULL, '', '2026-01-26 17:59:01'),
(95, 10, 2, 12, 45.00, 0, NULL, '', '2026-01-26 17:59:01');

-- --------------------------------------------------------

--
-- Table structure for table `member_fitness_goals`
--

CREATE TABLE `member_fitness_goals` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `goal_name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `member_fitness_goals`
--

INSERT INTO `member_fitness_goals` (`id`, `user_id`, `goal_name`, `created_at`) VALUES
(9, 13, 'Build Muscle', '2025-10-08 15:40:13'),
(10, 18, 'Build Muscle', '2025-10-14 07:26:02'),
(30, 33, 'General Fitness', '2025-10-17 08:21:21'),
(31, 33, 'Stay Healthy', '2025-10-17 08:21:21'),
(32, 33, 'Improve Endurance', '2025-10-17 08:21:21'),
(33, 36, 'Get Stronger', '2025-10-21 09:50:37'),
(34, 36, 'Build Muscle', '2025-10-21 09:50:37'),
(35, 35, 'Get Stronger', '2025-10-21 09:51:19'),
(36, 37, 'Build Muscle', '2025-10-21 09:56:26'),
(37, 37, 'Get Stronger', '2025-10-21 09:56:26'),
(44, 38, 'Build Muscle', '2025-10-24 08:22:03'),
(45, 43, 'Lose Weight', '2025-10-25 14:46:12'),
(46, 43, 'Improve Endurance', '2025-10-25 14:46:12'),
(47, 43, 'Stay Healthy', '2025-10-25 14:46:12'),
(48, 44, 'Build Muscle', '2025-10-26 15:57:48'),
(49, 44, 'Get Stronger', '2025-10-26 15:57:48'),
(50, 45, 'Build Muscle', '2025-10-27 17:47:09'),
(51, 45, 'Improve Endurance', '2025-10-27 17:47:09'),
(52, 48, 'Build Muscle', '2025-10-27 18:07:22'),
(53, 50, 'Build Muscle', '2025-10-27 18:35:09'),
(54, 51, 'Build Muscle', '2025-10-27 18:50:41'),
(55, 52, 'Build Muscle', '2025-10-27 18:57:55'),
(56, 53, 'Lose Weight', '2025-10-27 19:04:45'),
(57, 54, 'Build Muscle', '2025-10-27 19:09:51'),
(58, 55, 'Build Muscle', '2025-10-27 19:17:22'),
(59, 56, 'Build Muscle', '2025-10-27 19:22:43'),
(60, 57, 'Build Muscle', '2025-10-27 19:27:22'),
(61, 58, 'Build Muscle', '2025-10-27 19:35:50'),
(62, 59, 'Build Muscle', '2025-10-27 19:38:26'),
(63, 60, 'Build Muscle', '2025-10-27 19:49:59'),
(64, 61, 'Build Muscle', '2025-10-27 20:01:01'),
(65, 62, 'Build Muscle', '2025-10-27 20:07:51'),
(66, 63, 'Build Muscle', '2025-10-27 20:11:51'),
(67, 65, 'Get Stronger', '2025-10-27 20:16:50'),
(68, 66, 'Build Muscle', '2025-10-27 20:23:07'),
(69, 67, 'Build Muscle', '2025-10-27 20:27:15'),
(70, 72, 'Build Muscle', '2025-10-28 09:03:47'),
(71, 72, 'Improve Endurance', '2025-10-28 09:03:47'),
(72, 72, 'Get Stronger', '2025-10-28 09:03:47'),
(73, 73, 'Build Muscle', '2025-10-28 10:24:24'),
(74, 73, 'Improve Endurance', '2025-10-28 10:24:24'),
(75, 79, 'Build Muscle', '2025-11-08 06:37:21'),
(76, 71, 'Build Muscle', '2025-11-09 07:43:39'),
(77, 80, 'Build Muscle', '2025-11-09 07:48:15'),
(78, 81, 'Build Muscle', '2025-11-09 09:30:10'),
(79, 93, 'Build Muscle', '2025-11-12 05:08:15'),
(80, 94, 'Build Muscle', '2025-11-12 12:26:17'),
(81, 95, 'Build Muscle', '2025-11-12 15:12:57'),
(82, 99, 'Build Muscle', '2025-11-13 06:05:08'),
(83, 99, 'Improve Endurance', '2025-11-13 06:05:08'),
(84, 99, 'Stay Healthy', '2025-11-13 06:05:08'),
(85, 99, 'General Fitness', '2025-11-13 06:05:08'),
(86, 92, 'Build Muscle', '2025-11-13 07:21:05'),
(87, 100, 'Build Muscle', '2025-11-13 14:32:29'),
(88, 101, 'Build Muscle', '2025-11-13 16:06:38'),
(89, 102, 'Build Muscle', '2025-11-13 16:49:31'),
(90, 103, 'Build Muscle', '2025-11-13 17:09:17'),
(91, 104, 'Build Muscle', '2025-11-14 02:39:36'),
(92, 107, 'Build Muscle', '2025-11-14 07:06:18'),
(93, 108, 'Lose Weight', '2025-11-14 07:12:58'),
(94, 108, 'Build Muscle', '2025-11-14 07:12:58'),
(95, 108, 'Improve Endurance', '2025-11-14 07:12:58'),
(96, 108, 'Get Stronger', '2025-11-14 07:12:58'),
(97, 105, 'Build Muscle', '2025-11-14 10:27:16'),
(98, 109, 'Lose Weight', '2025-11-14 11:10:21'),
(99, 109, 'Build Muscle', '2025-11-14 11:10:21'),
(100, 109, 'Improve Endurance', '2025-11-14 11:10:21'),
(101, 109, 'Get Stronger', '2025-11-14 11:10:21'),
(102, 114, 'Build Muscle', '2025-11-17 05:19:49'),
(103, 116, 'Build Muscle', '2025-11-18 06:57:45'),
(104, 116, 'Lose Weight', '2025-11-18 06:57:45'),
(105, 116, 'Get Stronger', '2025-11-18 06:57:45'),
(106, 116, 'Improve Endurance', '2025-11-18 06:57:45'),
(107, 120, 'Lose Weight', '2025-11-18 10:10:17'),
(108, 120, 'Stay Healthy', '2025-11-18 10:10:17'),
(109, 120, 'General Fitness', '2025-11-18 10:10:17'),
(110, 120, 'Improve Endurance', '2025-11-18 10:10:17'),
(111, 125, 'Build Muscle', '2025-11-19 04:31:53'),
(112, 131, 'Lose Weight', '2025-11-20 03:23:11'),
(113, 131, 'Improve Endurance', '2025-11-20 03:23:11'),
(114, 131, 'Get Stronger', '2025-11-20 03:23:11'),
(115, 131, 'Build Muscle', '2025-11-20 03:23:11'),
(116, 2, 'Build Muscle', '2025-11-22 10:45:02'),
(119, 20, 'Build Muscle', '2025-11-24 04:30:53'),
(132, 8, 'Lose Weight', '2025-11-24 10:35:04'),
(135, 47, 'Build Muscle', '2025-11-25 08:58:44'),
(136, 47, 'Improve Endurance', '2025-11-25 08:58:44'),
(137, 47, 'Stay Healthy', '2025-11-25 08:58:44'),
(138, 3, 'Lose Weight', '2025-11-25 17:58:51'),
(139, 3, 'Build Muscle', '2025-11-25 17:58:51'),
(140, 3, 'Improve Endurance', '2025-11-25 17:58:51'),
(141, 3, 'Stay Healthy', '2025-11-25 17:58:51'),
(142, 3, 'General Fitness', '2025-11-25 17:58:51'),
(143, 3, 'Get Stronger', '2025-11-25 17:58:51'),
(144, 15, 'Build Muscle', '2025-11-25 18:26:38'),
(145, 17, 'Lose Weight', '2025-11-25 18:49:33'),
(146, 17, 'Build Muscle', '2025-11-25 18:49:33'),
(147, 17, 'Stay Healthy', '2025-11-25 18:49:33'),
(148, 17, 'General Fitness', '2025-11-25 18:49:33'),
(149, 4, 'Lose Weight', '2025-11-26 03:03:05'),
(150, 4, 'Build Muscle', '2025-11-26 03:03:05'),
(151, 5, 'Improve Endurance', '2025-11-26 03:15:31'),
(152, 5, 'Get Stronger', '2025-11-26 03:15:31'),
(153, 5, 'Stay Healthy', '2025-11-26 03:15:31'),
(154, 5, 'General Fitness', '2025-11-26 03:15:31'),
(155, 11, 'Build Muscle', '2025-11-26 05:31:03'),
(156, 11, 'Lose Weight', '2025-11-26 05:31:03'),
(157, 21, 'Build Muscle', '2026-01-25 09:54:17'),
(158, 22, 'Build Muscle', '2026-01-25 10:32:25'),
(159, 19, 'Lose Weight', '2026-01-26 05:31:10'),
(160, 19, 'Build Muscle', '2026-01-26 05:31:10'),
(161, 9, 'Build Muscle', '2026-01-26 05:41:32'),
(162, 23, 'Improve Endurance', '2026-01-26 05:47:37'),
(163, 24, 'Build Muscle', '2026-01-26 06:13:11'),
(164, 25, 'Lose Weight', '2026-01-26 06:20:29'),
(165, 26, 'Build Muscle', '2026-01-26 06:31:32'),
(166, 27, 'Lose Weight', '2026-01-26 06:41:29'),
(167, 28, 'Improve Endurance', '2026-01-26 17:30:51'),
(168, 29, 'Lose Weight', '2026-01-26 17:40:59'),
(169, 30, 'Build Muscle', '2026-01-26 17:48:30'),
(170, 30, 'General Fitness', '2026-01-26 17:48:30'),
(171, 31, 'Lose Weight', '2026-01-26 17:51:38'),
(172, 32, 'Lose Weight', '2026-01-28 02:57:51'),
(173, 34, 'Improve Endurance', '2026-01-30 06:26:43');

-- --------------------------------------------------------

--
-- Table structure for table `member_profile_details`
--

CREATE TABLE `member_profile_details` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `fitness_level` enum('Beginner','Intermediate','Advanced') DEFAULT NULL,
  `fitness_goal` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fitness_goal`)),
  `gender_id` int(11) DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `height_cm` decimal(5,2) DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `target_weight` decimal(5,2) DEFAULT NULL,
  `body_fat` decimal(5,2) DEFAULT NULL,
  `activity_level` enum('Sedentary','Light','Moderate','Active') DEFAULT NULL,
  `workout_frequency` int(11) DEFAULT NULL COMMENT 'Days per week: 2-7',
  `equipment_access` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `profile_completed` tinyint(1) DEFAULT 0,
  `profile_completed_at` timestamp NULL DEFAULT NULL,
  `onboarding_completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `member_profile_details`
--

INSERT INTO `member_profile_details` (`id`, `user_id`, `fitness_level`, `fitness_goal`, `gender_id`, `birthdate`, `height_cm`, `weight_kg`, `target_weight`, `body_fat`, `activity_level`, `workout_frequency`, `equipment_access`, `created_at`, `profile_completed`, `profile_completed_at`, `onboarding_completed_at`) VALUES
(75, 3, 'Beginner', '[\"Lose Weight\",\"Build Muscle\",\"Improve Endurance\",\"Stay Healthy\",\"General Fitness\",\"Get Stronger\"]', 1, '2025-11-26', 157.48, 79.00, NULL, NULL, 'Light', 3, NULL, '2025-11-25 17:58:51', 1, '2025-11-25 17:58:51', '2025-11-25 17:58:51'),
(76, 15, 'Intermediate', '[\"Build Muscle\"]', 1, '2025-11-26', 162.56, 55.00, NULL, NULL, 'Light', 3, NULL, '2025-11-25 18:26:38', 1, '2025-11-25 18:26:38', '2025-11-25 18:26:38'),
(77, 17, 'Advanced', '[\"Lose Weight\",\"Build Muscle\",\"Stay Healthy\",\"General Fitness\"]', 1, '2025-11-26', 175.00, 61.00, 65.00, NULL, 'Moderate', 3, NULL, '2025-11-25 18:49:33', 1, '2025-11-25 18:49:33', '2025-11-25 18:49:33'),
(78, 4, 'Beginner', '[\"Lose Weight\",\"Build Muscle\"]', 1, '2025-11-26', 160.02, 64.00, NULL, NULL, 'Sedentary', 3, NULL, '2025-11-26 03:03:05', 1, '2025-11-26 03:03:05', '2025-11-26 03:03:05'),
(79, 5, 'Beginner', '[\"Improve Endurance\",\"Get Stronger\",\"Stay Healthy\",\"General Fitness\"]', 1, '2025-11-26', 165.10, 50.00, 60.00, NULL, 'Moderate', 3, 'home', '2025-11-26 03:15:31', 1, '2025-11-26 03:15:31', '2025-11-26 03:15:31'),
(80, 11, 'Beginner', '[\"Build Muscle\",\"Lose Weight\"]', 1, '2025-11-26', 165.10, 55.00, NULL, NULL, 'Light', 3, NULL, '2025-11-26 05:31:03', 1, '2025-11-26 05:31:03', '2025-11-26 05:31:03'),
(81, 21, 'Beginner', '[\"Build Muscle\"]', 1, '2026-01-25', 184.00, 80.00, 90.00, NULL, 'Sedentary', 3, NULL, '2026-01-25 09:54:17', 1, '2026-01-25 09:54:17', '2026-01-25 09:54:17'),
(82, 22, 'Intermediate', '[\"Build Muscle\"]', 1, '2026-01-25', 184.00, 85.00, NULL, NULL, 'Sedentary', 3, NULL, '2026-01-25 10:32:25', 1, '2026-01-25 10:32:25', '2026-01-25 10:32:25'),
(83, 19, 'Beginner', '[\"Lose Weight\",\"Build Muscle\"]', 1, '2026-01-26', 184.00, 85.00, NULL, NULL, 'Sedentary', 3, NULL, '2026-01-26 05:31:10', 1, '2026-01-26 05:31:10', '2026-01-26 05:31:10'),
(84, 9, 'Beginner', '[\"Build Muscle\"]', 1, '2026-01-26', 120.00, 20.00, NULL, NULL, 'Sedentary', 3, NULL, '2026-01-26 05:41:32', 1, '2026-01-26 05:41:32', '2026-01-26 05:41:32'),
(85, 23, 'Advanced', '[\"Improve Endurance\"]', 1, '2026-01-26', 200.00, 200.00, NULL, NULL, 'Light', 3, NULL, '2026-01-26 05:47:37', 1, '2026-01-26 05:47:37', '2026-01-26 05:47:37'),
(86, 24, 'Intermediate', '[\"Build Muscle\"]', 1, '2026-01-26', 200.00, 200.00, 200.00, NULL, 'Sedentary', 3, NULL, '2026-01-26 06:13:11', 1, '2026-01-26 06:13:11', '2026-01-26 06:13:11'),
(87, 25, 'Beginner', '[\"Lose Weight\"]', 1, '2026-01-26', 200.00, 200.00, NULL, NULL, 'Moderate', 3, NULL, '2026-01-26 06:20:29', 1, '2026-01-26 06:20:29', '2026-01-26 06:20:29'),
(88, 26, 'Beginner', '[\"Build Muscle\"]', 1, '2026-01-26', 54.00, 54.00, NULL, NULL, 'Sedentary', 3, NULL, '2026-01-26 06:31:32', 1, '2026-01-26 06:31:32', '2026-01-26 06:31:32'),
(89, 27, 'Intermediate', '[\"Lose Weight\"]', 1, '2026-01-26', 200.00, 200.00, NULL, NULL, 'Sedentary', 3, NULL, '2026-01-26 06:41:29', 1, '2026-01-26 06:41:29', '2026-01-26 06:41:29'),
(90, 28, 'Intermediate', '[\"Improve Endurance\"]', 1, '2026-01-27', 200.00, 200.00, NULL, NULL, 'Sedentary', 3, NULL, '2026-01-26 17:30:51', 1, '2026-01-26 17:30:51', '2026-01-26 17:30:51'),
(91, 29, 'Beginner', '[\"Lose Weight\"]', 1, '2026-01-27', 200.00, 200.00, NULL, NULL, 'Light', 3, NULL, '2026-01-26 17:40:59', 1, '2026-01-26 17:40:59', '2026-01-26 17:40:59'),
(92, 30, 'Beginner', '[\"Build Muscle\",\"General Fitness\"]', 1, '2026-01-27', 200.00, 200.00, NULL, NULL, 'Sedentary', 3, NULL, '2026-01-26 17:48:30', 1, '2026-01-26 17:48:30', '2026-01-26 17:48:30'),
(93, 31, 'Beginner', '[\"Lose Weight\"]', 1, '2026-01-27', 200.00, 200.00, NULL, NULL, 'Light', 3, NULL, '2026-01-26 17:51:38', 1, '2026-01-26 17:51:38', '2026-01-26 17:51:38'),
(94, 32, 'Beginner', '[\"Lose Weight\"]', 1, '2026-01-28', 200.00, 200.00, NULL, NULL, 'Sedentary', 3, NULL, '2026-01-28 02:57:51', 1, '2026-01-28 02:57:51', '2026-01-28 02:57:51'),
(95, 34, 'Intermediate', '[\"Improve Endurance\"]', 1, '2026-01-30', 200.00, 200.00, NULL, NULL, 'Light', 3, NULL, '2026-01-30 06:26:43', 1, '2026-01-30 06:26:43', '2026-01-30 06:26:43');

-- --------------------------------------------------------

--
-- Table structure for table `member_programhdr`
--

CREATE TABLE `member_programhdr` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `program_hdr_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `goal` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `completion_rate` int(11) DEFAULT 0,
  `scheduled_days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scheduled_days`)),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `difficulty` varchar(50) DEFAULT NULL,
  `total_sessions` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `member_programhdr`
--

INSERT INTO `member_programhdr` (`id`, `user_id`, `program_hdr_id`, `created_by`, `color`, `tags`, `goal`, `notes`, `completion_rate`, `scheduled_days`, `created_at`, `updated_at`, `difficulty`, `total_sessions`) VALUES
(3, 5, NULL, NULL, '4288371126', '[]', '', '', 0, '[]', '2025-11-26 03:21:11', '2025-11-26 03:21:11', '', 0),
(4, 4, NULL, 3, '4288371126', '[]', 'General Fitness', '', 0, '[]', '2025-11-26 03:32:20', '2025-11-26 03:32:20', 'Beginner', 0),
(5, 11, 1, NULL, '#3B82F6', '[]', '', 'Push Day focuses on exercises that train all the muscles used for pushing movements: the chest, shoulders, and triceps. This workout is designed for beginners and helps build strength, improve form, and create a solid foundation for future training.', 40, '[]', '2025-11-26 05:32:47', '2026-01-26 17:59:01', 'Beginner', 27),
(6, 11, NULL, 3, '4283354564', '[]', 'General Fitness', '', 0, '[]', '2025-11-26 05:50:40', '2025-11-26 05:53:17', 'Beginner', 1);

--
-- Triggers `member_programhdr`
--
DELIMITER $$
CREATE TRIGGER `notify_program_assigned` AFTER INSERT ON `member_programhdr` FOR EACH ROW BEGIN
    DECLARE coach_name VARCHAR(255);
    
    IF NEW.created_by IS NOT NULL AND NEW.created_by != NEW.user_id THEN
        SELECT CONCAT(u.fname, ' ', u.lname) INTO coach_name 
        FROM user u 
        WHERE u.id = NEW.created_by;
        
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.user_id, 
            CONCAT('? New workout program assigned by ', COALESCE(coach_name, 'a Coach'), ': ', NEW.goal),
            1, 
            7, 
            NOW()
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `member_program_schedule`
--

CREATE TABLE `member_program_schedule` (
  `id` int(11) NOT NULL,
  `member_program_hdr_id` int(11) NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `workout_id` int(11) DEFAULT NULL,
  `scheduled_time` time DEFAULT '09:00:00',
  `is_rest_day` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `member_program_schedule`
--

INSERT INTO `member_program_schedule` (`id`, `member_program_hdr_id`, `day_of_week`, `workout_id`, `scheduled_time`, `is_rest_day`, `is_active`, `notes`, `created_at`, `updated_at`) VALUES
(539, 4, 'Monday', NULL, NULL, 1, 1, NULL, '2025-11-26 03:57:31', '2025-11-26 03:57:31'),
(540, 4, 'Tuesday', NULL, NULL, 1, 1, NULL, '2025-11-26 03:57:31', '2025-11-26 03:57:31'),
(541, 4, 'Wednesday', 4, '09:00:00', 0, 1, NULL, '2025-11-26 03:57:31', '2025-11-26 03:57:31'),
(542, 4, 'Thursday', NULL, NULL, 1, 1, NULL, '2025-11-26 03:57:31', '2025-11-26 03:57:31'),
(543, 4, 'Friday', NULL, NULL, 1, 1, NULL, '2025-11-26 03:57:31', '2025-11-26 03:57:31'),
(544, 4, 'Saturday', NULL, NULL, 1, 1, NULL, '2025-11-26 03:57:31', '2025-11-26 03:57:31'),
(545, 4, 'Sunday', NULL, NULL, 1, 1, NULL, '2025-11-26 03:57:31', '2025-11-26 03:57:31');

-- --------------------------------------------------------

--
-- Table structure for table `member_program_workout`
--

CREATE TABLE `member_program_workout` (
  `id` int(11) NOT NULL,
  `member_program_hdr_id` int(11) DEFAULT NULL,
  `workout_details` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `member_program_workout`
--

INSERT INTO `member_program_workout` (`id`, `member_program_hdr_id`, `workout_details`) VALUES
(3, 3, '{\"name\":\"Para sa defense\",\"duration\":\"\",\"created_at\":\"2025-11-26 03:21:11\"}'),
(4, 4, '{\"name\":\"Chest back ego lift style\",\"duration\":\"30\",\"created_at\":\"2025-11-26 03:32:20\",\"exercise_set_configs\":[]}'),
(5, 5, '{\"name\":\"Push Day\",\"description\":\"Push Day focuses on exercises that train all the muscles used for pushing movements: the chest, shoulders, and triceps. This workout is designed for beginners and helps build strength, improve form, and create a solid foundation for future training.\",\"difficulty\":\"Beginner\",\"goal\":\"Push Day\",\"duration\":\"30 days\",\"created_at\":\"2025-11-26 03:06:25\",\"is_template\":true,\"template_id\":\"1\"}'),
(6, 6, '{\"name\":\"Francis Baron\'s Program\",\"duration\":\"30\",\"created_at\":\"2025-11-26 05:50:40\",\"exercise_set_configs\":[]}');

-- --------------------------------------------------------

--
-- Table structure for table `member_subscription_plan`
--

CREATE TABLE `member_subscription_plan` (
  `id` int(11) NOT NULL,
  `plan_name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_member_only` tinyint(1) DEFAULT 0,
  `discounted_price` decimal(10,2) DEFAULT NULL,
  `duration_months` int(11) DEFAULT 1,
  `duration_days` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `member_subscription_plan`
--

INSERT INTO `member_subscription_plan` (`id`, `plan_name`, `price`, `is_member_only`, `discounted_price`, `duration_months`, `duration_days`) VALUES
(1, 'Gym Membership', 500.00, 0, NULL, 12, 0),
(2, 'Monthly Access (Premium)', 999.00, 1, NULL, 1, 0),
(3, 'Monthly Access (Standard)', 1300.00, 0, NULL, 1, 0),
(6, 'Gym Session', 150.00, 0, NULL, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `member_workout_exercise`
--

CREATE TABLE `member_workout_exercise` (
  `id` int(11) NOT NULL,
  `member_program_workout_id` int(11) DEFAULT NULL,
  `exercise_id` int(11) DEFAULT NULL,
  `reps` int(11) NOT NULL,
  `sets` int(11) NOT NULL,
  `weight` decimal(5,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `member_workout_exercise`
--

INSERT INTO `member_workout_exercise` (`id`, `member_program_workout_id`, `exercise_id`, `reps`, `sets`, `weight`) VALUES
(8, 3, 28, 10, 3, 0.00),
(9, 3, 50, 10, 3, 0.00),
(10, 3, 73, 10, 3, 0.00),
(11, 3, 29, 10, 3, 0.00),
(12, 3, 32, 10, 3, 0.00),
(13, 3, 42, 10, 3, 0.00),
(14, 3, 14, 10, 3, 0.00),
(15, 3, 16, 10, 3, 0.00),
(16, 4, 62, 10, 3, 0.00),
(17, 4, 16, 10, 3, 0.00),
(18, 4, 14, 10, 3, 0.00),
(19, 5, 16, 0, 2, 0.00),
(20, 5, 15, 0, 2, 0.00),
(21, 5, 70, 0, 2, 0.00),
(22, 5, 45, 0, 2, 0.00),
(23, 5, 26, 0, 3, 0.00),
(24, 6, 14, 10, 3, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `merchandise`
--

CREATE TABLE `merchandise` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `image_url` text NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `sender_id` int(11) DEFAULT NULL,
  `receiver_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `timestamp` datetime DEFAULT current_timestamp(),
  `is_read` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `sender_id`, `receiver_id`, `message`, `timestamp`, `is_read`) VALUES
(70, 4, 3, 'hi coach unsa atong i workout ron?', '2025-11-26 03:30:23', 0),
(71, 3, 4, 'back and chest ta ron maam', '2025-11-26 03:30:39', 1),
(72, 4, 3, 'ah okay coach what time karun coach?', '2025-11-26 03:30:53', 0),
(73, 3, 4, '3pm lang madam', '2025-11-26 03:31:02', 1),
(74, 11, 3, 'hi', '2025-11-26 05:49:34', 0),
(75, 3, 11, 'Hello', '2025-11-26 05:50:08', 1),
(76, 11, 3, 'pagsyor', '2026-01-23 12:36:30', 0);

--
-- Triggers `messages`
--
DELIMITER $$
CREATE TRIGGER `notify_coach_member_message` AFTER INSERT ON `messages` FOR EACH ROW BEGIN
    DECLARE member_name_var VARCHAR(255);
    DECLARE sender_user_type INT;
    DECLARE receiver_user_type INT;
    DECLARE unread_status_id INT DEFAULT 1;
    DECLARE coach_type_id INT DEFAULT 7;
    
    -- Get sender and receiver user types
    SELECT user_type_id INTO sender_user_type FROM user WHERE id = NEW.sender_id;
    SELECT user_type_id INTO receiver_user_type FROM user WHERE id = NEW.receiver_id;
    
    -- Notify coach if:
    -- 1. Receiver is a coach (user_type_id = 3)
    -- 2. Sender is a member (user_type_id = 4)
    -- 3. This is not a duplicate notification (check if already notified recently)
    IF receiver_user_type = 3 
       AND sender_user_type = 4
       AND NEW.receiver_id IS NOT NULL THEN
        
        -- Get member name
        SELECT CONCAT(COALESCE(fname, ''), ' ', COALESCE(lname, '')) INTO member_name_var
        FROM user
        WHERE id = NEW.sender_id;
        
        -- Get notification status and type IDs
        SELECT id INTO unread_status_id FROM notification_status WHERE status_name = 'Unread' LIMIT 1;
        IF unread_status_id IS NULL THEN SET unread_status_id = 1; END IF;
        
        SELECT id INTO coach_type_id FROM notification_type WHERE type_name = 'coach' LIMIT 1;
        IF coach_type_id IS NULL THEN SET coach_type_id = 7; END IF;
        
        -- Create notification for coach
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.receiver_id,
            CONCAT('New message from ', COALESCE(member_name_var, 'a member'), ': ', 
                   LEFT(NEW.message, 50), 
                   CASE 
                       WHEN LENGTH(NEW.message) > 50 THEN '...'
                       ELSE ''
                   END),
            unread_status_id,
            coach_type_id,
            NOW()
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_coach_message` AFTER INSERT ON `messages` FOR EACH ROW BEGIN
    DECLARE coach_name VARCHAR(255);
    DECLARE user_type INT;
    
    -- Get coach name and user type
    SELECT CONCAT(u.fname, ' ', u.lname), u.user_type_id 
    INTO coach_name, user_type
    FROM user u 
    WHERE u.id = NEW.sender_id;
    
    -- Notify if message is from a coach (user_type_id = 3)
    IF user_type = 3 THEN
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.receiver_id, 
            CONCAT('New message from your coach ', coach_name, ': ', LEFT(NEW.message, 50), '...'),
            1, 
            7, 
            NOW()
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `my_goals`
--

CREATE TABLE `my_goals` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `goal` text NOT NULL,
  `target_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `status` enum('active','achieved','cancelled') DEFAULT 'active',
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Triggers `my_goals`
--
DELIMITER $$
CREATE TRIGGER `notify_goal_achieved_my_goals` AFTER UPDATE ON `my_goals` FOR EACH ROW BEGIN
    IF NEW.status = 'achieved' AND OLD.status != 'achieved' THEN
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.user_id, 
            CONCAT('? GOAL ACHIEVED! ', NEW.goal, ' - Congratulations!'),
            1, 
            6, 
            NOW()
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `status_id` int(11) DEFAULT NULL,
  `type_id` int(11) DEFAULT NULL,
  `timestamp` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `notification`
--

INSERT INTO `notification` (`id`, `user_id`, `message`, `status_id`, `type_id`, `timestamp`) VALUES
(1, 1, 'New product added: \"Vitamilk\" (?48.00) with 8 units in stock', 1, 1, '2025-11-26 10:37:51'),
(2, 1, 'New product added: \"Cnergy Shirt\" (?100.00) with 11 units in stock', 1, 1, '2025-11-26 10:38:37'),
(3, 1, 'New product added: \"Key Chain\" (?80.00) with 8 units in stock', 1, 1, '2025-11-26 10:39:25'),
(4, 1, 'New product added: \"Whey Gold Standard\" (?80.00) with 15 units in stock', 1, 1, '2025-11-26 10:41:08'),
(5, 1, 'New product added: \"Amino Capstule 1 per capsule\" (?10.00) with 10 units in stock', 1, 1, '2025-11-26 10:42:05'),
(6, 1, 'New product added: \"Cenergy Towel\" (?100.00) with 12 units in stock', 1, 1, '2025-11-26 10:42:39'),
(7, 1, 'New product added: \"Creatine\" (?35.00) with 5 units in stock', 1, 1, '2025-11-26 10:43:32'),
(8, 1, 'New product added: \"Cnergy Cap\" (?200.00) with 5 units in stock', 1, 1, '2025-11-26 10:44:21'),
(9, 1, 'New sale recorded: ?48.00', 1, 2, '2025-11-26 10:57:38'),
(10, 1, 'New sale recorded: ?48.00', 1, 1, '2025-11-26 10:57:38'),
(11, 3, 'New sale recorded: ?48.00', 1, 1, '2025-11-26 10:57:38'),
(13, 1, 'New sale recorded: ?100.00', 1, 2, '2025-11-26 10:57:57'),
(14, 1, 'New sale recorded: ?100.00', 1, 1, '2025-11-26 10:57:57'),
(15, 3, 'New sale recorded: ?100.00', 1, 1, '2025-11-26 10:57:57'),
(17, 1, 'New sale recorded: ?20.00', 1, 2, '2025-11-26 10:58:18'),
(18, 1, 'New sale recorded: ?20.00', 1, 1, '2025-11-26 10:58:18'),
(19, 3, 'New sale recorded: ?20.00', 1, 1, '2025-11-26 10:58:18'),
(21, 1, 'New sale recorded: ?160.00', 1, 2, '2025-11-26 10:58:34'),
(22, 1, 'New sale recorded: ?160.00', 1, 1, '2025-11-26 10:58:34'),
(23, 3, 'New sale recorded: ?160.00', 1, 1, '2025-11-26 10:58:34'),
(25, 1, 'New member registered: Joanne Sagiahon (joanne@gmail.com)', 1, 1, '2025-11-26 03:01:08'),
(26, 1, 'New sale recorded: ?500.00', 1, 2, '2025-11-26 11:01:13'),
(27, 1, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 11:01:13'),
(28, 3, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 11:01:13'),
(30, 1, 'New sale recorded: ?850.00', 1, 2, '2025-11-26 11:01:13'),
(31, 1, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 11:01:13'),
(32, 3, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 11:01:13'),
(34, 4, 'Your Gym Membership subscription has been successfully activated. Valid from Nov 26, 2025 to Nov 26, 2026. Start enjoying your membership benefits today.', 2, 3, '2025-11-26 11:01:13'),
(35, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2025-11-26 11:01:13'),
(36, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2025-11-26 11:01:13'),
(37, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2025-11-26 11:01:13'),
(38, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2025-11-26 11:01:13'),
(42, 4, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Nov 26, 2025 to Dec 26, 2025. Start enjoying your membership benefits today.', 2, 3, '2025-11-26 11:01:13'),
(43, 4, '?? Achievement Unlocked: First Check-In', 1, 3, '2025-11-26 03:11:56'),
(44, 4, '?? Achievement Unlocked: 1 Month Member', 1, 3, '2025-11-26 03:11:56'),
(45, 4, '?? Achievement Unlocked: 6 Months Strong', 1, 3, '2025-11-26 03:11:56'),
(46, 4, '?? Achievement Unlocked: 1 Year Loyalty', 1, 3, '2025-11-26 03:11:56'),
(47, 4, '?? Achievement Unlocked: Goal Setter', 1, 3, '2025-11-26 03:11:56'),
(48, 4, '?? Achievement Unlocked: 3 Month Champion', 1, 3, '2025-11-26 03:11:56'),
(49, 1, 'New member registered: Dodong Noynay (chsa.noynay.coc@phinmaed.com)', 1, 1, '2025-11-26 03:12:58'),
(50, 1, 'New sale recorded: ?500.00', 1, 2, '2025-11-26 11:13:59'),
(51, 1, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 11:13:59'),
(52, 3, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 11:13:59'),
(54, 1, 'New sale recorded: ?999.00', 1, 2, '2025-11-26 11:13:59'),
(55, 1, 'New sale recorded: ?999.00', 1, 1, '2025-11-26 11:13:59'),
(56, 3, 'New sale recorded: ?999.00', 1, 1, '2025-11-26 11:13:59'),
(58, 5, 'Your Gym Membership subscription has been successfully activated. Valid from Nov 26, 2025 to Nov 26, 2026. Start enjoying your membership benefits today.', 1, 3, '2025-11-26 11:13:59'),
(59, 1, 'Gym Almost Full: The gym is 4% full (2/50). Only 48 spots remaining.', 1, 2, '2025-11-26 11:13:59'),
(60, 2, 'Gym Almost Full: The gym is 4% full (2/50). Only 48 spots remaining.', 1, 2, '2025-11-26 11:13:59'),
(61, 3, 'Gym Almost Full: The gym is 4% full (2/50). Only 48 spots remaining.', 1, 2, '2025-11-26 11:13:59'),
(62, 4, 'Gym Almost Full: The gym is 4% full (2/50). Only 48 spots remaining.', 1, 2, '2025-11-26 11:13:59'),
(63, 5, 'Gym Almost Full: The gym is 4% full (2/50). Only 48 spots remaining.', 1, 2, '2025-11-26 11:13:59'),
(66, 5, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Nov 26, 2025 to Dec 26, 2025. Start enjoying your membership benefits today.', 1, 3, '2025-11-26 11:13:59'),
(67, 1, 'New sale recorded: ?500.00', 1, 2, '2025-11-26 11:17:31'),
(68, 1, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 11:17:31'),
(69, 3, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 11:17:31'),
(71, 1, 'New sale recorded: ?150.00', 1, 2, '2025-11-26 11:17:44'),
(72, 1, 'New sale recorded: ?150.00', 1, 1, '2025-11-26 11:17:44'),
(73, 3, 'New sale recorded: ?150.00', 1, 1, '2025-11-26 11:17:44'),
(75, 1, 'New sale recorded: ?300.00', 1, 2, '2025-11-26 11:19:22'),
(76, 1, 'New sale recorded: ?300.00', 1, 1, '2025-11-26 11:19:22'),
(77, 3, 'New sale recorded: ?300.00', 1, 1, '2025-11-26 11:19:22'),
(79, 1, 'New sale recorded: ?150.00', 1, 2, '2025-11-26 11:20:13'),
(80, 1, 'New sale recorded: ?150.00', 1, 1, '2025-11-26 11:20:13'),
(81, 3, 'New sale recorded: ?150.00', 1, 1, '2025-11-26 11:20:13'),
(83, 1, 'New sale recorded: ?150.00', 1, 2, '2025-11-26 11:20:47'),
(84, 1, 'New sale recorded: ?150.00', 1, 1, '2025-11-26 11:20:47'),
(85, 3, 'New sale recorded: ?150.00', 1, 1, '2025-11-26 11:20:47'),
(87, 1, 'Stock updated: \"Amino Capstule 1 per capsule\" changed from 8 to 58 units', 1, 1, '2025-11-26 11:21:21'),
(88, 1, 'Stock updated: \"Vitamilk\" changed from 7 to 49 units', 1, 1, '2025-11-26 11:21:27'),
(89, 1, 'Stock updated: \"Cnergy Shirt\" changed from 11 to 34 units', 1, 1, '2025-11-26 11:21:43'),
(90, 4, '?? New promotion: STUDENTS SPECIAL – Exclusive Discount! - Bring your student ID and enjoy a special rate when you sign up for any monthly gym plan.', 1, 3, '2025-11-26 03:22:24'),
(91, 5, '?? New promotion: STUDENTS SPECIAL – Exclusive Discount! - Bring your student ID and enjoy a special rate when you sign up for any monthly gym plan.', 1, 3, '2025-11-26 03:22:24'),
(93, 1, 'New product added: \"Gatorade\" (?48.00) with 32 units in stock', 1, 1, '2025-11-26 11:22:25'),
(94, 4, '?? New promotion: 55+ SPECIAL OFFER - If you’re 55 or older, simply show a valid ID confirming your age to receive a special rate on our monthly gym plans.', 1, 3, '2025-11-26 03:23:03'),
(95, 5, '?? New promotion: 55+ SPECIAL OFFER - If you’re 55 or older, simply show a valid ID confirming your age to receive a special rate on our monthly gym plans.', 1, 3, '2025-11-26 03:23:03'),
(97, 4, '?? Achievement Unlocked: Progress Tracker', 1, 3, '2025-11-26 03:24:05'),
(98, 3, 'Joanne Sagiahon left you a 3-star review: great coach! but there is something missing...', 1, 6, '2025-11-26 03:24:48'),
(99, 3, 'New message from Joanne Sagiahon: hi coach unsa atong i workout ron?', 1, 7, '2025-11-26 03:30:23'),
(100, 4, 'New message from your coach Kent Wilson Gildo: back and chest ta ron maam...', 1, 7, '2025-11-26 03:30:39'),
(101, 3, 'New message from Joanne Sagiahon: ah okay coach what time karun coach?', 1, 7, '2025-11-26 03:30:53'),
(102, 4, 'New message from your coach Kent Wilson Gildo: 3pm lang madam...', 1, 7, '2025-11-26 03:31:02'),
(103, 1, 'New member registered: Cjay Gallegos (christiannoynay5@gmail.com)', 1, 1, '2025-11-26 03:31:58'),
(104, 4, '? New workout program assigned by Kent Wilson Gildo: General Fitness', 1, 7, '2025-11-26 03:32:20'),
(105, 1, 'New sale recorded: ?999.00', 1, 2, '2025-11-26 11:33:28'),
(106, 1, 'New sale recorded: ?999.00', 1, 1, '2025-11-26 11:33:28'),
(107, 3, 'New sale recorded: ?999.00', 1, 1, '2025-11-26 11:33:28'),
(108, 6, 'New sale recorded: ?999.00', 1, 1, '2025-11-26 11:33:28'),
(109, 1, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:33:28'),
(110, 2, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:33:28'),
(111, 3, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:33:28'),
(112, 4, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:33:28'),
(113, 5, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:33:28'),
(114, 6, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:33:28'),
(115, 7, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:33:28'),
(116, 7, 'Your Monthly Access (Standard) subscription has been successfully activated. Valid from Nov 26, 2025 to Dec 26, 2025. Start enjoying your membership benefits today.', 1, 3, '2025-11-26 11:33:28'),
(117, 1, 'New sale recorded: ?3200.00', 1, 2, '2025-11-26 11:37:25'),
(118, 1, 'New sale recorded: ?3,200.00', 1, 1, '2025-11-26 11:37:25'),
(119, 3, 'New sale recorded: ?3,200.00', 1, 1, '2025-11-26 11:37:25'),
(120, 6, 'New sale recorded: ?3,200.00', 1, 1, '2025-11-26 11:37:25'),
(121, 1, 'New member registered: Mae versoza (versozamae@gmail.com)', 1, 1, '2025-11-26 03:38:53'),
(122, 1, 'New sale recorded: ?500.00', 1, 2, '2025-11-26 11:38:53'),
(123, 1, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 11:38:53'),
(124, 3, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 11:38:53'),
(125, 6, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 11:38:53'),
(126, 1, 'New sale recorded: ?599.00', 1, 2, '2025-11-26 11:38:53'),
(127, 1, 'New sale recorded: ?599.00', 1, 1, '2025-11-26 11:38:53'),
(128, 3, 'New sale recorded: ?599.00', 1, 1, '2025-11-26 11:38:53'),
(129, 6, 'New sale recorded: ?599.00', 1, 1, '2025-11-26 11:38:53'),
(130, 8, 'Your Gym Membership subscription has been successfully activated. Valid from Nov 26, 2025 to Nov 26, 2026. Start enjoying your membership benefits today.', 1, 3, '2025-11-26 11:38:53'),
(131, 1, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 11:38:53'),
(132, 2, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 11:38:53'),
(133, 3, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 11:38:53'),
(134, 4, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 11:38:53'),
(135, 5, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 11:38:53'),
(136, 6, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 11:38:53'),
(137, 7, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 11:38:53'),
(138, 8, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 11:38:53'),
(146, 8, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Nov 26, 2025 to Dec 26, 2025. Start enjoying your membership benefits today.', 1, 3, '2025-11-26 11:38:53'),
(147, 1, 'New member registered: Jerry Gildo (gildojerry@gmail.com)', 1, 1, '2025-11-26 03:53:39'),
(148, 1, 'New sale recorded: ?150.00', 1, 2, '2025-11-26 11:59:58'),
(149, 1, 'New sale recorded: ?150.00', 1, 1, '2025-11-26 11:59:58'),
(150, 3, 'New sale recorded: ?150.00', 1, 1, '2025-11-26 11:59:58'),
(151, 6, 'New sale recorded: ?150.00', 1, 1, '2025-11-26 11:59:58'),
(152, 1, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:59:58'),
(153, 2, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:59:58'),
(154, 3, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:59:58'),
(155, 4, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:59:58'),
(156, 5, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:59:58'),
(157, 6, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:59:58'),
(158, 7, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:59:58'),
(159, 8, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:59:58'),
(160, 9, 'Gym Almost Full: The gym is 6% full (3/50). Only 47 spots remaining.', 1, 2, '2025-11-26 11:59:58'),
(167, 9, 'Your Gym Session subscription has been successfully activated. Valid from Nov 26, 2025 to Nov 26, 2025. Start enjoying your membership benefits today.', 1, 3, '2025-11-26 11:59:58'),
(168, 1, 'Stock updated: \"Creatine\" changed from 5 to 65 units', 1, 1, '2025-11-26 12:02:31'),
(169, 1, 'New member registered: francis gildo (francisgildo@gmail.com)', 1, 1, '2025-11-26 05:11:05'),
(170, 1, 'New sale recorded: ?500.00', 1, 2, '2025-11-26 13:11:06'),
(171, 1, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 13:11:06'),
(172, 3, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 13:11:06'),
(173, 6, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 13:11:06'),
(174, 1, 'New sale recorded: ?850.00', 1, 2, '2025-11-26 13:11:06'),
(175, 1, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 13:11:06'),
(176, 3, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 13:11:06'),
(177, 6, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 13:11:06'),
(178, 10, 'Your Gym Membership subscription has been successfully activated. Valid from Nov 26, 2025 to Nov 26, 2026. Start enjoying your membership benefits today.', 1, 3, '2025-11-26 13:11:06'),
(179, 1, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 13:11:06'),
(180, 2, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 13:11:06'),
(181, 3, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 13:11:06'),
(182, 4, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 13:11:06'),
(183, 5, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 13:11:06'),
(184, 6, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 13:11:06'),
(185, 7, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 13:11:06'),
(186, 8, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 13:11:06'),
(187, 9, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 13:11:06'),
(188, 10, 'Gym Almost Full: The gym is 8% full (4/50). Only 46 spots remaining.', 1, 2, '2025-11-26 13:11:06'),
(194, 10, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Nov 26, 2025 to Dec 26, 2025. Start enjoying your membership benefits today.', 1, 3, '2025-11-26 13:11:06'),
(195, 1, 'New member registered: Francis Baron Uyguangco (uyguangco.francisbaron@gmail.com)', 1, 1, '2025-11-26 05:18:45'),
(196, 1, 'New sale recorded: ?850.00', 1, 2, '2025-11-26 13:30:10'),
(197, 1, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 13:30:10'),
(198, 3, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 13:30:10'),
(199, 6, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 13:30:10'),
(200, 1, 'New sale recorded: ?500.00', 1, 2, '2025-11-26 13:30:10'),
(201, 1, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 13:30:10'),
(202, 3, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 13:30:10'),
(203, 6, 'New sale recorded: ?500.00', 1, 1, '2025-11-26 13:30:10'),
(204, 1, 'Gym Almost Full: The gym is 10% full (5/50). Only 45 spots remaining.', 1, 2, '2025-11-26 13:30:10'),
(205, 2, 'Gym Almost Full: The gym is 10% full (5/50). Only 45 spots remaining.', 1, 2, '2025-11-26 13:30:10'),
(206, 3, 'Gym Almost Full: The gym is 10% full (5/50). Only 45 spots remaining.', 1, 2, '2025-11-26 13:30:10'),
(207, 4, 'Gym Almost Full: The gym is 10% full (5/50). Only 45 spots remaining.', 1, 2, '2025-11-26 13:30:10'),
(208, 5, 'Gym Almost Full: The gym is 10% full (5/50). Only 45 spots remaining.', 1, 2, '2025-11-26 13:30:10'),
(209, 6, 'Gym Almost Full: The gym is 10% full (5/50). Only 45 spots remaining.', 1, 2, '2025-11-26 13:30:10'),
(210, 7, 'Gym Almost Full: The gym is 10% full (5/50). Only 45 spots remaining.', 1, 2, '2025-11-26 13:30:10'),
(211, 8, 'Gym Almost Full: The gym is 10% full (5/50). Only 45 spots remaining.', 1, 2, '2025-11-26 13:30:10'),
(212, 9, 'Gym Almost Full: The gym is 10% full (5/50). Only 45 spots remaining.', 1, 2, '2025-11-26 13:30:10'),
(213, 10, 'Gym Almost Full: The gym is 10% full (5/50). Only 45 spots remaining.', 1, 2, '2025-11-26 13:30:10'),
(226, 1, '? New support request: broken equipment', 1, 8, '2025-11-26 05:41:26'),
(227, 1, 'New support request: broken equipment', 1, 8, '2025-11-26 05:41:26'),
(231, 1, 'New sale recorded: ?3200.00', 1, 2, '2025-11-26 13:49:22'),
(232, 1, 'New sale recorded: ?3,200.00', 1, 1, '2025-11-26 13:49:22'),
(233, 3, 'New sale recorded: ?3,200.00', 1, 1, '2025-11-26 13:49:22'),
(234, 6, 'New sale recorded: ?3,200.00', 1, 1, '2025-11-26 13:49:22'),
(235, 3, 'New message from Francis Baron Uyguangco: hi', 1, 7, '2025-11-26 05:49:34'),
(238, 1, 'New sale recorded: ?850.00', 1, 2, '2025-11-26 13:52:21'),
(239, 1, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 13:52:21'),
(240, 3, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 13:52:21'),
(241, 6, 'New sale recorded: ?850.00', 1, 1, '2025-11-26 13:52:21'),
(243, 3, 'Joanne Sagiahon\'s personal coaching has expired.', 1, 2, '2025-11-29 22:15:52'),
(244, 1, 'New member registered: Jason Lemuel (lemy@gmail.com)', 1, 1, '2025-11-29 14:18:25'),
(245, 1, 'New sale recorded: ?500.00', 1, 2, '2025-11-29 22:18:26'),
(246, 1, 'New sale recorded: ?500.00', 1, 1, '2025-11-29 22:18:26'),
(247, 3, 'New sale recorded: ?500.00', 1, 1, '2025-11-29 22:18:26'),
(248, 6, 'New sale recorded: ?500.00', 1, 1, '2025-11-29 22:18:26'),
(249, 1, 'New sale recorded: ?850.00', 1, 2, '2025-11-29 22:18:26'),
(250, 1, 'New sale recorded: ?850.00', 1, 1, '2025-11-29 22:18:26'),
(251, 3, 'New sale recorded: ?850.00', 1, 1, '2025-11-29 22:18:26'),
(252, 6, 'New sale recorded: ?850.00', 1, 1, '2025-11-29 22:18:26'),
(253, 12, 'Your Gym Membership subscription has been successfully activated. Valid from Nov 29, 2025 to Nov 29, 2026. Start enjoying your membership benefits today.', 1, 3, '2025-11-29 22:18:26'),
(254, 12, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Nov 29, 2025 to Dec 29, 2025. Start enjoying your membership benefits today.', 1, 3, '2025-11-29 22:18:26'),
(255, 1, 'New member registered: Honey Lim (honeylim@gmail.com)', 1, 1, '2025-11-29 14:21:50'),
(256, 1, 'New sale recorded: ?500.00', 1, 2, '2025-11-29 22:21:50'),
(257, 1, 'New sale recorded: ?500.00', 1, 1, '2025-11-29 22:21:50'),
(258, 3, 'New sale recorded: ?500.00', 1, 1, '2025-11-29 22:21:50'),
(259, 6, 'New sale recorded: ?500.00', 1, 1, '2025-11-29 22:21:50'),
(260, 13, 'Your Gym Membership subscription has been successfully activated. Valid from Nov 29, 2025 to Nov 29, 2026. Start enjoying your membership benefits today.', 1, 3, '2025-11-29 22:21:50'),
(261, 1, 'New sale recorded: ?999.00', 1, 2, '2025-11-29 22:21:50'),
(262, 1, 'New sale recorded: ?999.00', 1, 1, '2025-11-29 22:21:50'),
(263, 3, 'New sale recorded: ?999.00', 1, 1, '2025-11-29 22:21:50'),
(264, 6, 'New sale recorded: ?999.00', 1, 1, '2025-11-29 22:21:50'),
(265, 13, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Nov 29, 2025 to Dec 29, 2025. Start enjoying your membership benefits today.', 1, 3, '2025-11-29 22:21:50'),
(266, 1, 'New member registered: Edward Cy (cy@gmail.com)', 1, 1, '2025-11-29 15:05:30'),
(267, 1, 'New sale recorded: ?500.00', 1, 2, '2025-11-29 23:05:30'),
(268, 1, 'New sale recorded: ?500.00', 1, 1, '2025-11-29 23:05:30'),
(269, 3, 'New sale recorded: ?500.00', 1, 1, '2025-11-29 23:05:30'),
(270, 6, 'New sale recorded: ?500.00', 1, 1, '2025-11-29 23:05:30'),
(271, 1, 'New sale recorded: ?999.00', 1, 2, '2025-11-29 23:05:30'),
(272, 1, 'New sale recorded: ?999.00', 1, 1, '2025-11-29 23:05:30'),
(273, 3, 'New sale recorded: ?999.00', 1, 1, '2025-11-29 23:05:30'),
(274, 6, 'New sale recorded: ?999.00', 1, 1, '2025-11-29 23:05:30'),
(275, 14, 'Your Gym Membership subscription has been successfully activated. Valid from Nov 29, 2025 to Nov 29, 2026. Start enjoying your membership benefits today.', 1, 3, '2025-11-29 23:05:30'),
(276, 14, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Nov 29, 2025 to Dec 29, 2025. Start enjoying your membership benefits today.', 1, 3, '2025-11-29 23:05:30'),
(277, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-20 07:53:01'),
(278, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-20 07:53:01'),
(279, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-20 07:53:01'),
(280, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-20 07:53:01'),
(281, 3, 'Raziel Jabulan\'s personal coaching has expired.', 1, 2, '2026-01-21 19:19:52'),
(282, 3, 'Francis Baron Uyguangco\'s personal coaching has expired.', 1, 2, '2026-01-21 19:19:52'),
(283, 1, 'New member registered: Harley Dave (dave@gmail.com)', 1, 1, '2026-01-22 17:57:18'),
(284, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-23 01:57:19'),
(285, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 01:57:19'),
(286, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 01:57:19'),
(287, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 01:57:19'),
(288, 15, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 22, 2026 to Jan 22, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-23 01:57:19'),
(289, 1, 'New member registered: JunJun Juniebvoy (junie@gmail.com)', 1, 1, '2026-01-22 18:19:00'),
(290, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-23 02:19:01'),
(291, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-23 02:19:01'),
(292, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-23 02:19:01'),
(293, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-23 02:19:01'),
(294, 16, 'Your Gym Session subscription has been successfully activated. Valid from Jan 23, 2026 to Jan 23, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-23 02:19:01'),
(295, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-23 02:19:01'),
(296, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:19:01'),
(297, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:19:01'),
(298, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:19:01'),
(299, 16, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 22, 2026 to Jan 22, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-23 02:19:01'),
(300, 1, 'New member registered: young bloood (blooda@gmail.com)', 1, 1, '2026-01-22 18:25:36'),
(301, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-23 02:25:37'),
(302, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:25:37'),
(303, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:25:37'),
(304, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:25:37'),
(305, 17, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 22, 2026 to Jan 22, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-23 02:25:37'),
(306, 1, 'New member registered: King Henry (henrycy@gmail.com)', 1, 1, '2026-01-22 18:39:28'),
(307, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-23 02:39:29'),
(308, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:39:29'),
(309, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:39:29'),
(310, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:39:29'),
(311, 18, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 22, 2026 to Jan 22, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-23 02:39:29'),
(312, 1, 'New member registered: Jmmy Jim (jim@gmail.com)', 1, 1, '2026-01-22 18:44:27'),
(313, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-23 02:44:27'),
(314, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:44:27'),
(315, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:44:27'),
(316, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 02:44:27'),
(317, 19, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 22, 2026 to Jan 22, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-23 02:44:27'),
(318, 1, 'New member registered: jhuh hbg (hbhg@gmail.com)', 1, 1, '2026-01-22 19:08:37'),
(319, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-23 03:08:38'),
(320, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 03:08:38'),
(321, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 03:08:38'),
(322, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-23 03:08:38'),
(323, 20, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 22, 2026 to Jan 22, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-23 03:08:38'),
(324, 3, 'New message from Francis Baron Uyguangco: pagsyor', 1, 7, '2026-01-23 12:36:30'),
(325, 1, 'New member registered: Rjay Tan (rjtan@gmail.com)', 1, 1, '2026-01-25 09:24:58'),
(326, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-25 17:28:31'),
(327, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-25 17:28:31'),
(328, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-25 17:28:31'),
(329, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-25 17:28:31'),
(330, 1, 'New sale recorded: ?850.00', 1, 2, '2026-01-25 17:28:31'),
(331, 1, 'New sale recorded: ?850.00', 1, 1, '2026-01-25 17:28:31'),
(332, 3, 'New sale recorded: ?850.00', 1, 1, '2026-01-25 17:28:31'),
(333, 6, 'New sale recorded: ?850.00', 1, 1, '2026-01-25 17:28:31'),
(334, 21, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 25, 2026 to Jan 25, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-25 17:28:31'),
(335, 21, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Jan 25, 2026 to Feb 25, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-25 17:28:31'),
(336, 1, 'New member registered: Jay Lou (Lou@gmail.con)', 1, 1, '2026-01-25 09:43:47'),
(337, 1, 'New sale recorded: ?850.00', 1, 2, '2026-01-25 17:44:13'),
(338, 1, 'New sale recorded: ?850.00', 1, 1, '2026-01-25 17:44:13'),
(339, 3, 'New sale recorded: ?850.00', 1, 1, '2026-01-25 17:44:13'),
(340, 6, 'New sale recorded: ?850.00', 1, 1, '2026-01-25 17:44:13'),
(341, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-25 17:44:13'),
(342, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-25 17:44:13'),
(343, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-25 17:44:13'),
(344, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-25 17:44:13'),
(345, 22, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Jan 25, 2026 to Feb 25, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-25 17:44:13'),
(346, 22, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 25, 2026 to Jan 25, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-25 17:44:13'),
(347, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(348, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(349, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(350, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(351, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(352, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(353, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(354, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(355, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(356, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(358, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(359, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(360, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(361, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(362, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(363, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(364, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(365, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(366, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(367, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(368, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-25 17:54:33'),
(378, 1, '? New support request: negro', 1, 8, '2026-01-25 10:00:45'),
(379, 1, 'New support request: negro', 1, 8, '2026-01-25 10:00:45'),
(380, 1, 'New sale recorded: ?850.00', 1, 2, '2026-01-25 18:02:30'),
(381, 1, 'New sale recorded: ?850.00', 1, 1, '2026-01-25 18:02:30'),
(382, 3, 'New sale recorded: ?850.00', 1, 1, '2026-01-25 18:02:30'),
(383, 6, 'New sale recorded: ?850.00', 1, 1, '2026-01-25 18:02:30'),
(386, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(387, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(388, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(389, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(390, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(391, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(392, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(393, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(394, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(395, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(397, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(398, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(399, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(400, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(401, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(402, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(403, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(404, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(405, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(406, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(407, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:13:45'),
(417, 1, 'New member registered: David GoliGOli (goli@gmail.com)', 1, 1, '2026-01-26 05:47:12'),
(418, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-26 13:47:12'),
(419, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 13:47:12'),
(420, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 13:47:12'),
(421, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 13:47:12'),
(422, 23, 'Your Gym Session subscription has been successfully activated. Valid from Jan 26, 2026 to Jan 26, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-26 13:47:12'),
(423, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(424, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(425, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(426, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(427, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(428, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(429, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(430, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(431, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(432, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(434, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(435, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(436, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(437, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(438, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(439, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(440, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(441, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(442, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(443, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(444, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(445, 23, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 13:57:41'),
(454, 1, 'New member registered: Harley Davidson (d@gmail.com)', 1, 1, '2026-01-26 06:12:55'),
(455, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-26 14:12:55'),
(456, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:12:55'),
(457, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:12:55'),
(458, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:12:55'),
(459, 24, 'Your Gym Session subscription has been successfully activated. Valid from Jan 26, 2026 to Jan 26, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-26 14:12:55'),
(460, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(461, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(462, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(463, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(464, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(465, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(466, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(467, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(468, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(469, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(471, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(472, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(473, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(474, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(475, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(476, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(477, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(478, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(479, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(480, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(481, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(482, 23, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(483, 24, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:13:17'),
(491, 1, 'New member registered: Lim li (li@gmail.com)', 1, 1, '2026-01-26 06:20:05'),
(492, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-26 14:20:06'),
(493, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:20:06'),
(494, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:20:06'),
(495, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:20:06'),
(496, 25, 'Your Gym Session subscription has been successfully activated. Valid from Jan 26, 2026 to Jan 26, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-26 14:20:06'),
(497, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(498, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(499, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(500, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(501, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(502, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(503, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(504, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(505, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(506, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(508, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(509, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(510, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(511, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(512, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(513, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(514, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(515, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(516, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(517, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(518, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(519, 23, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(520, 24, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(521, 25, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:22:47'),
(528, 1, 'New member registered: ZOm zom (zom@gmail.com)', 1, 1, '2026-01-26 06:31:14'),
(529, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-26 14:31:14'),
(530, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:31:14'),
(531, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:31:14'),
(532, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:31:14'),
(533, 26, 'Your Gym Session subscription has been successfully activated. Valid from Jan 26, 2026 to Jan 26, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-26 14:31:14'),
(534, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(535, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(536, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(537, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(538, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(539, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(540, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(541, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(542, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(543, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(545, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(546, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(547, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(548, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(549, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(550, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(551, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(552, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(553, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(554, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(555, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(556, 23, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(557, 24, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(558, 25, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(559, 26, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:31:46'),
(565, 1, 'New member registered: LAm la (lamio@gmail.com)', 1, 1, '2026-01-26 06:41:15'),
(566, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-26 14:41:15'),
(567, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:41:15'),
(568, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:41:15'),
(569, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-26 14:41:15'),
(570, 27, 'Your Gym Session subscription has been successfully activated. Valid from Jan 26, 2026 to Jan 26, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-26 14:41:15'),
(571, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(572, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(573, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(574, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(575, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(576, 24, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(577, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(578, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(579, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(580, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(581, 23, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(582, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(583, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(584, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(585, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(586, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(587, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(588, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(589, 27, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(590, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(591, 25, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(592, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(593, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(594, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(596, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(597, 26, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-26 14:41:38'),
(602, 1, 'New member registered: James Lemmy (james@gmail.com)', 1, 1, '2026-01-26 17:30:34'),
(603, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-27 01:30:34'),
(604, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 01:30:34'),
(605, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 01:30:34'),
(606, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 01:30:34'),
(607, 28, 'Your Gym Session subscription has been successfully activated. Valid from Jan 27, 2026 to Jan 27, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-27 01:30:34'),
(608, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(609, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(610, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(611, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(612, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(613, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(614, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(615, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(616, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(617, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(619, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59');
INSERT INTO `notification` (`id`, `user_id`, `message`, `status_id`, `type_id`, `timestamp`) VALUES
(620, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(621, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(622, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(623, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(624, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(625, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(626, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(627, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(628, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(629, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(630, 23, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(631, 24, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(632, 25, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(633, 26, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(634, 27, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(635, 28, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:30:59'),
(639, 1, 'New member registered: Domm Dom (dom@gmail.com)', 1, 1, '2026-01-26 17:40:45'),
(640, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-27 01:40:46'),
(641, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 01:40:46'),
(642, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 01:40:46'),
(643, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 01:40:46'),
(644, 29, 'Your Gym Session subscription has been successfully activated. Valid from Jan 27, 2026 to Jan 27, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-27 01:40:46'),
(645, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(646, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(647, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(648, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(649, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(650, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(651, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(652, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(653, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(654, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(656, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(657, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(658, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(659, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(660, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(661, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(662, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(663, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(664, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(665, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(666, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(667, 23, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(668, 24, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(669, 25, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(670, 26, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(671, 27, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(672, 28, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(673, 29, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:41:08'),
(678, 1, 'New member registered: le le (le@gmail.com)', 1, 1, '2026-01-26 17:48:09'),
(679, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-27 01:48:09'),
(680, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 01:48:09'),
(681, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 01:48:09'),
(682, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 01:48:09'),
(683, 30, 'Your Gym Session subscription has been successfully activated. Valid from Jan 27, 2026 to Jan 27, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-27 01:48:09'),
(684, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(685, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(686, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(687, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(688, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(689, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(690, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(691, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(692, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(693, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(695, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(696, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(697, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(698, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(699, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(700, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(701, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(702, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(703, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(704, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(705, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(706, 23, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(707, 24, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(708, 25, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(709, 26, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(710, 27, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(711, 28, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(712, 29, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(713, 30, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-27 01:48:37'),
(715, 1, 'New member registered: Crister Jane (jane@gmail.com)', 1, 1, '2026-01-26 17:50:40'),
(716, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-27 01:50:41'),
(717, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-27 01:50:41'),
(718, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-27 01:50:41'),
(719, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-27 01:50:41'),
(720, 1, 'New sale recorded: ?850.00', 1, 2, '2026-01-27 01:50:41'),
(721, 1, 'New sale recorded: ?850.00', 1, 1, '2026-01-27 01:50:41'),
(722, 3, 'New sale recorded: ?850.00', 1, 1, '2026-01-27 01:50:41'),
(723, 6, 'New sale recorded: ?850.00', 1, 1, '2026-01-27 01:50:41'),
(724, 31, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 26, 2026 to Jan 26, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-27 01:50:41'),
(725, 31, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Jan 26, 2026 to Feb 26, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-27 01:50:41'),
(726, 11, '?? Achievement Unlocked: First Check-In', 1, 3, '2026-01-26 17:57:45'),
(727, 11, '?? Achievement Unlocked: 1 Month Member', 1, 3, '2026-01-26 17:57:45'),
(728, 11, '?? Achievement Unlocked: Goal Setter', 1, 3, '2026-01-26 17:57:45'),
(729, 11, '?? Achievement Unlocked: Intermediate Lifter', 1, 3, '2026-01-26 17:57:45'),
(730, 11, '?? Achievement Unlocked: Progress Tracker', 1, 3, '2026-01-26 17:57:45'),
(731, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-27 02:00:00'),
(732, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 02:00:00'),
(733, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 02:00:00'),
(734, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 02:00:00'),
(735, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-27 02:25:14'),
(736, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 02:25:14'),
(737, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 02:25:14'),
(738, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 02:25:14'),
(739, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-27 02:25:40'),
(740, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 02:25:40'),
(741, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 02:25:40'),
(742, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-27 02:25:40'),
(743, 1, 'New sale recorded: ?240.00', 1, 2, '2026-01-27 02:27:04'),
(744, 1, 'New sale recorded: ?240.00', 1, 1, '2026-01-27 02:27:04'),
(745, 3, 'New sale recorded: ?240.00', 1, 1, '2026-01-27 02:27:04'),
(746, 6, 'New sale recorded: ?240.00', 1, 1, '2026-01-27 02:27:04'),
(747, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-27 02:36:25'),
(748, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-27 02:36:25'),
(749, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-27 02:36:25'),
(750, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-27 02:36:25'),
(751, 31, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 26, 2026 to Jan 26, 2028. Start enjoying your membership benefits today.', 1, 3, '2026-01-27 02:36:25'),
(752, 1, 'New sale recorded: ?3200.00', 1, 2, '2026-01-27 02:37:05'),
(753, 1, 'New sale recorded: ?3,200.00', 1, 1, '2026-01-27 02:37:05'),
(754, 3, 'New sale recorded: ?3,200.00', 1, 1, '2026-01-27 02:37:05'),
(755, 6, 'New sale recorded: ?3,200.00', 1, 1, '2026-01-27 02:37:05'),
(756, 4, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(757, 5, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(758, 7, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(759, 8, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(760, 9, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(761, 10, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(762, 11, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(763, 12, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(764, 13, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(765, 14, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(766, 15, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(767, 16, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(768, 17, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(769, 18, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(770, 19, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(771, 20, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(772, 21, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(773, 22, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(774, 23, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(775, 24, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(776, 25, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(777, 26, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(778, 27, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(779, 28, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(780, 29, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(781, 30, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(782, 31, '?? New promotion: TEST 01 - Testosterone', 1, 3, '2026-01-26 18:37:49'),
(787, 1, 'New sale recorded: ?400.00', 1, 2, '2026-01-27 02:38:19'),
(788, 1, 'New sale recorded: ?400.00', 1, 1, '2026-01-27 02:38:19'),
(789, 3, 'New sale recorded: ?400.00', 1, 1, '2026-01-27 02:38:19'),
(790, 6, 'New sale recorded: ?400.00', 1, 1, '2026-01-27 02:38:19'),
(791, 1, 'New sale recorded: ?400.00', 1, 2, '2026-01-27 15:05:19'),
(792, 1, 'New sale recorded: ?400.00', 1, 1, '2026-01-27 15:05:19'),
(793, 3, 'New sale recorded: ?400.00', 1, 1, '2026-01-27 15:05:19'),
(794, 6, 'New sale recorded: ?400.00', 1, 1, '2026-01-27 15:05:19'),
(795, 1, 'New member registered: Rjayy Tan (rjtann@gmail.com)', 1, 1, '2026-01-28 02:50:06'),
(796, 1, 'New sale recorded: ?850.00', 1, 2, '2026-01-28 10:54:15'),
(797, 1, 'New sale recorded: ?850.00', 1, 1, '2026-01-28 10:54:15'),
(798, 3, 'New sale recorded: ?850.00', 1, 1, '2026-01-28 10:54:15'),
(799, 6, 'New sale recorded: ?850.00', 1, 1, '2026-01-28 10:54:15'),
(800, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-28 10:54:15'),
(801, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-28 10:54:15'),
(802, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-28 10:54:15'),
(803, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-28 10:54:15'),
(804, 32, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Jan 28, 2026 to Feb 28, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-28 10:54:15'),
(805, 32, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 28, 2026 to Jan 28, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-28 10:54:15'),
(806, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(807, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(808, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(809, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(810, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(811, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(812, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(813, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(814, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(815, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(816, 11, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(817, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(818, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(819, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(820, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(821, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(822, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(823, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(824, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(825, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(826, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(827, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(828, 23, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(829, 24, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(830, 25, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(831, 26, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(832, 27, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(833, 28, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(834, 29, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(835, 30, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(836, 31, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(837, 32, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-28 10:58:05'),
(869, 1, 'New sale recorded: ?144.00', 1, 2, '2026-01-28 11:01:55'),
(870, 1, 'New sale recorded: ?144.00', 1, 1, '2026-01-28 11:01:55'),
(871, 3, 'New sale recorded: ?144.00', 1, 1, '2026-01-28 11:01:55'),
(872, 6, 'New sale recorded: ?144.00', 1, 1, '2026-01-28 11:01:55'),
(873, 1, 'Stock updated: \"Gatorade\" changed from 24 to 84 units', 1, 1, '2026-01-28 11:04:35'),
(874, 1, 'New sale recorded: ?850.00', 1, 2, '2026-01-28 11:06:59'),
(875, 1, 'New sale recorded: ?850.00', 1, 1, '2026-01-28 11:06:59'),
(876, 3, 'New sale recorded: ?850.00', 1, 1, '2026-01-28 11:06:59'),
(877, 6, 'New sale recorded: ?850.00', 1, 1, '2026-01-28 11:06:59'),
(878, 1, '? New support request: broken machine', 1, 8, '2026-01-28 03:16:52'),
(879, 1, 'New support request: broken machine', 1, 8, '2026-01-28 03:16:52'),
(880, 32, '? New reply on your support request: ok...', 1, 8, '2026-01-28 03:17:13'),
(881, 32, 'Your support request is being processed.', 1, 8, '2026-01-28 03:17:13'),
(882, 1, 'New member registered: Won Wan (wan@gmail.com)', 1, 1, '2026-01-30 05:52:07'),
(883, 1, 'New sale recorded: ?999.00', 1, 2, '2026-01-30 13:52:09'),
(884, 1, 'New sale recorded: ?999.00', 1, 1, '2026-01-30 13:52:09'),
(885, 3, 'New sale recorded: ?999.00', 1, 1, '2026-01-30 13:52:09'),
(886, 6, 'New sale recorded: ?999.00', 1, 1, '2026-01-30 13:52:09'),
(887, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-30 13:52:09'),
(888, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 13:52:09'),
(889, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 13:52:09'),
(890, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 13:52:09'),
(891, 33, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Jan 30, 2026 to Mar 02, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-30 13:52:09'),
(892, 33, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 30, 2026 to Jan 30, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-30 13:52:09'),
(893, 1, 'New member registered: Limey Skirt (Skirt@gmail.com)', 1, 1, '2026-01-30 06:25:08'),
(894, 1, 'New sale recorded: ?999.00', 1, 2, '2026-01-30 14:25:31'),
(895, 1, 'New sale recorded: ?999.00', 1, 1, '2026-01-30 14:25:31'),
(896, 3, 'New sale recorded: ?999.00', 1, 1, '2026-01-30 14:25:31'),
(897, 6, 'New sale recorded: ?999.00', 1, 1, '2026-01-30 14:25:31'),
(898, 34, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Jan 30, 2026 to Mar 02, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-30 14:25:31'),
(899, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-30 14:25:31'),
(900, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 14:25:31'),
(901, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 14:25:31'),
(902, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 14:25:31'),
(903, 34, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 30, 2026 to Jan 30, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-30 14:25:31'),
(904, 1, '? New support request: Broken Machine', 1, 8, '2026-01-30 06:27:11'),
(905, 1, 'New support request: Broken Machine', 1, 8, '2026-01-30 06:27:11'),
(906, 34, '? New reply on your support request: aha dapita sir...', 1, 8, '2026-01-30 06:27:35'),
(907, 34, 'Your support request is being processed.', 1, 8, '2026-01-30 06:27:36'),
(908, 34, '? New reply on your support request: okay asikasohon namo na todya sir...', 1, 8, '2026-01-30 06:27:59'),
(909, 34, 'Your support request has been resolved.', 1, 8, '2026-01-30 06:28:33'),
(910, 11, 'Your support request has been resolved.', 1, 8, '2026-01-30 06:39:28'),
(911, 11, '? New reply on your support request: pak u...', 1, 8, '2026-01-30 06:39:41'),
(912, 11, 'Your support request is being processed.', 1, 8, '2026-01-30 06:39:42'),
(913, 11, 'Your support request has been resolved.', 1, 8, '2026-01-30 06:39:46'),
(914, 32, 'Your support request has been resolved.', 1, 8, '2026-01-30 06:39:55'),
(915, 1, '? New support request: Guba ag cr', 1, 8, '2026-01-30 06:40:32'),
(916, 1, 'New support request: Guba ag cr', 1, 8, '2026-01-30 06:40:32'),
(917, 34, '? New reply on your support request: pag sure dha oy...', 1, 8, '2026-01-30 06:41:15'),
(918, 34, 'Your support request is being processed.', 1, 8, '2026-01-30 06:41:17'),
(919, 34, '? New reply on your support request: ok dong tinood jud diay aing gi taguan...', 1, 8, '2026-01-30 06:46:05'),
(920, 34, 'Your support request has been resolved.', 1, 8, '2026-01-30 06:46:10'),
(921, 1, '? New support request: tabangi ko bi', 1, 8, '2026-01-30 07:23:03'),
(922, 1, 'New support request: tabangi ko bi', 1, 8, '2026-01-30 07:23:03'),
(923, 34, '? New reply on your support request: spot binaong man ka ah...', 1, 8, '2026-01-30 07:23:14'),
(924, 34, 'Your support request is being processed.', 1, 8, '2026-01-30 07:23:15'),
(925, 34, 'Your support request has been resolved.', 1, 8, '2026-01-30 07:23:27'),
(926, 1, 'New member registered: Rendon Lavrador (lavvy@gmail.com)', 1, 1, '2026-01-30 07:26:01'),
(927, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-30 15:26:01'),
(928, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 15:26:01'),
(929, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 15:26:01'),
(930, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 15:26:01'),
(931, 35, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 30, 2026 to Jan 30, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-30 15:26:01'),
(932, 1, 'New sale recorded: ?140.00', 1, 2, '2026-01-30 15:26:36'),
(933, 1, 'New sale recorded: ?140.00', 1, 1, '2026-01-30 15:26:36'),
(934, 3, 'New sale recorded: ?140.00', 1, 1, '2026-01-30 15:26:36'),
(935, 6, 'New sale recorded: ?140.00', 1, 1, '2026-01-30 15:26:36'),
(936, 1, 'New member registered: LAbitad tadtad (taddy@gmail.com)', 1, 1, '2026-01-30 08:14:19'),
(937, 1, 'New sale recorded: ?500.00', 1, 2, '2026-01-30 16:14:19'),
(938, 1, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 16:14:19'),
(939, 3, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 16:14:19'),
(940, 6, 'New sale recorded: ?500.00', 1, 1, '2026-01-30 16:14:19'),
(941, 1, 'New sale recorded: ?999.00', 1, 2, '2026-01-30 16:14:19'),
(942, 1, 'New sale recorded: ?999.00', 1, 1, '2026-01-30 16:14:19'),
(943, 3, 'New sale recorded: ?999.00', 1, 1, '2026-01-30 16:14:19'),
(944, 6, 'New sale recorded: ?999.00', 1, 1, '2026-01-30 16:14:19'),
(945, 36, 'Your Gym Membership subscription has been successfully activated. Valid from Jan 30, 2026 to Jan 30, 2027. Start enjoying your membership benefits today.', 1, 3, '2026-01-30 16:14:19'),
(946, 36, 'Your Monthly Access (Premium) subscription has been successfully activated. Valid from Jan 30, 2026 to Mar 02, 2026. Start enjoying your membership benefits today.', 1, 3, '2026-01-30 16:14:19'),
(947, 2, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(948, 1, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(949, 3, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(950, 4, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(951, 5, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(952, 6, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(953, 7, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(954, 8, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(955, 9, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(956, 10, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(957, 11, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(958, 12, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(959, 13, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(960, 14, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(961, 15, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(962, 16, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(963, 17, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(964, 18, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(965, 19, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(966, 20, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(967, 21, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(968, 22, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(969, 23, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(970, 24, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(971, 25, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(972, 26, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(973, 27, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(974, 28, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(975, 29, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(976, 30, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(977, 31, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(978, 32, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(979, 33, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(980, 34, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(981, 35, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(982, 36, 'Gym Almost Full: The gym is 2% full (1/50). Only 49 spots remaining.', 1, 2, '2026-01-30 16:40:14'),
(1010, 1, 'New sale recorded: ?150.00', 1, 2, '2026-01-31 12:54:24'),
(1011, 1, 'New sale recorded: ?150.00', 1, 1, '2026-01-31 12:54:24'),
(1012, 3, 'New sale recorded: ?150.00', 1, 1, '2026-01-31 12:54:24'),
(1013, 6, 'New sale recorded: ?150.00', 1, 1, '2026-01-31 12:54:24'),
(1014, 3, 'Francis Baron Uyguangco left you a 3-star review: na inspire ko ni coach mag steroids', 1, 6, '2026-01-31 05:26:45');

-- --------------------------------------------------------

--
-- Table structure for table `notification_status`
--

CREATE TABLE `notification_status` (
  `id` int(11) NOT NULL,
  `status_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `notification_status`
--

INSERT INTO `notification_status` (`id`, `status_name`) VALUES
(1, 'Unread'),
(2, 'Read'),
(3, 'Unread'),
(4, 'Read'),
(5, 'Unread'),
(6, 'Read'),
(7, 'Unread'),
(8, 'Read'),
(9, 'Unread'),
(10, 'Read'),
(11, 'Unread'),
(12, 'Read'),
(13, 'Unread'),
(14, 'Read'),
(15, 'Unread'),
(16, 'Read'),
(17, 'Unread'),
(18, 'Read'),
(19, 'Unread'),
(20, 'Read'),
(21, 'Unread'),
(22, 'Read'),
(23, 'Unread'),
(24, 'Read'),
(25, 'Unread'),
(26, 'Read'),
(27, 'Unread'),
(28, 'Read'),
(29, 'Unread'),
(30, 'Read'),
(31, 'Unread'),
(32, 'Read'),
(33, 'Unread'),
(34, 'Read'),
(35, 'Unread'),
(36, 'Read'),
(37, 'Unread'),
(38, 'Read'),
(39, 'Unread'),
(40, 'Read'),
(41, 'Unread'),
(42, 'Read'),
(43, 'Unread'),
(44, 'Read'),
(45, 'Unread'),
(46, 'Read'),
(47, 'Unread'),
(48, 'Read'),
(49, 'Unread'),
(50, 'Read'),
(51, 'Unread'),
(52, 'Read'),
(53, 'Unread'),
(54, 'Read'),
(55, 'Unread'),
(56, 'Read'),
(57, 'Unread'),
(58, 'Read'),
(59, 'Unread'),
(60, 'Read'),
(61, 'Unread'),
(62, 'Read'),
(63, 'Unread'),
(64, 'Read'),
(65, 'Unread'),
(66, 'Read'),
(67, 'Unread'),
(68, 'Read'),
(69, 'Unread'),
(70, 'Read'),
(71, 'Unread'),
(72, 'Read'),
(73, 'Unread'),
(74, 'Read'),
(75, 'Unread'),
(76, 'Read'),
(77, 'Unread'),
(78, 'Read'),
(79, 'Unread'),
(80, 'Read'),
(81, 'Unread'),
(82, 'Read'),
(83, 'Unread'),
(84, 'Read'),
(85, 'Unread'),
(86, 'Read'),
(87, 'Unread'),
(88, 'Read'),
(89, 'Unread'),
(90, 'Read'),
(91, 'Unread'),
(92, 'Read'),
(93, 'Unread'),
(94, 'Read'),
(95, 'Unread'),
(96, 'Read'),
(97, 'Unread'),
(98, 'Read'),
(99, 'Unread'),
(100, 'Read'),
(101, 'Unread'),
(102, 'Read'),
(103, 'Unread'),
(104, 'Read'),
(105, 'Unread'),
(106, 'Read'),
(107, 'Unread'),
(108, 'Read'),
(109, 'Unread'),
(110, 'Read'),
(111, 'Unread'),
(112, 'Read'),
(113, 'Unread'),
(114, 'Read'),
(115, 'Unread'),
(116, 'Read'),
(117, 'Unread'),
(118, 'Read'),
(119, 'Unread'),
(120, 'Read'),
(121, 'Unread'),
(122, 'Read'),
(123, 'Unread'),
(124, 'Read'),
(125, 'Unread'),
(126, 'Read'),
(127, 'Unread'),
(128, 'Read'),
(129, 'Unread'),
(130, 'Read'),
(131, 'Unread'),
(132, 'Read'),
(133, 'Unread'),
(134, 'Read'),
(135, 'Unread'),
(136, 'Read'),
(137, 'Unread'),
(138, 'Read'),
(139, 'Unread'),
(140, 'Read'),
(141, 'Unread'),
(142, 'Read'),
(143, 'Unread'),
(144, 'Read'),
(145, 'Unread'),
(146, 'Read'),
(147, 'Unread'),
(148, 'Read'),
(149, 'Unread'),
(150, 'Read'),
(151, 'Unread'),
(152, 'Read'),
(153, 'Unread'),
(154, 'Read'),
(155, 'Unread'),
(156, 'Read');

-- --------------------------------------------------------

--
-- Table structure for table `notification_type`
--

CREATE TABLE `notification_type` (
  `id` int(11) NOT NULL,
  `type_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `notification_type`
--

INSERT INTO `notification_type` (`id`, `type_name`) VALUES
(1, 'info'),
(2, 'warning'),
(3, 'success'),
(4, 'info'),
(5, 'success'),
(6, 'warning'),
(7, 'error'),
(8, 'info'),
(9, 'success'),
(10, 'warning'),
(11, 'error'),
(12, 'info'),
(13, 'success'),
(14, 'warning'),
(15, 'error'),
(16, 'info'),
(17, 'success'),
(18, 'warning'),
(19, 'error'),
(20, 'info'),
(21, 'success'),
(22, 'warning'),
(23, 'error'),
(24, 'info'),
(25, 'success'),
(26, 'warning'),
(27, 'error'),
(28, 'info'),
(29, 'success'),
(30, 'warning'),
(31, 'error'),
(32, 'info'),
(33, 'success'),
(34, 'warning'),
(35, 'error'),
(36, 'info'),
(37, 'success'),
(38, 'warning'),
(39, 'error'),
(40, 'info'),
(41, 'success'),
(42, 'warning'),
(43, 'error'),
(44, 'info'),
(45, 'success'),
(46, 'warning'),
(47, 'error'),
(48, 'info'),
(49, 'success'),
(50, 'warning'),
(51, 'error'),
(52, 'info'),
(53, 'success'),
(54, 'warning'),
(55, 'error'),
(56, 'info'),
(57, 'success'),
(58, 'warning'),
(59, 'error'),
(60, 'info'),
(61, 'success'),
(62, 'warning'),
(63, 'error'),
(64, 'info'),
(65, 'success'),
(66, 'warning'),
(67, 'error'),
(68, 'info'),
(69, 'success'),
(70, 'warning'),
(71, 'error'),
(72, 'info'),
(73, 'success'),
(74, 'warning'),
(75, 'error'),
(76, 'info'),
(77, 'success'),
(78, 'warning'),
(79, 'error'),
(80, 'info'),
(81, 'success'),
(82, 'warning'),
(83, 'error'),
(84, 'info'),
(85, 'success'),
(86, 'warning'),
(87, 'error'),
(88, 'info'),
(89, 'success'),
(90, 'warning'),
(91, 'error'),
(92, 'info'),
(93, 'success'),
(94, 'warning'),
(95, 'error'),
(96, 'info'),
(97, 'success'),
(98, 'warning'),
(99, 'error'),
(100, 'info'),
(101, 'success'),
(102, 'warning'),
(103, 'error'),
(104, 'info'),
(105, 'success'),
(106, 'warning'),
(107, 'error'),
(108, 'info'),
(109, 'success'),
(110, 'warning'),
(111, 'error'),
(112, 'info'),
(113, 'success'),
(114, 'warning'),
(115, 'error'),
(116, 'info'),
(117, 'success'),
(118, 'warning'),
(119, 'error'),
(120, 'info'),
(121, 'success'),
(122, 'warning'),
(123, 'error'),
(124, 'info'),
(125, 'success'),
(126, 'warning'),
(127, 'error'),
(128, 'info'),
(129, 'success'),
(130, 'warning'),
(131, 'error'),
(132, 'info'),
(133, 'success'),
(134, 'warning'),
(135, 'error'),
(136, 'info'),
(137, 'success'),
(138, 'warning'),
(139, 'error'),
(140, 'info'),
(141, 'success'),
(142, 'warning'),
(143, 'error'),
(144, 'info'),
(145, 'success'),
(146, 'warning'),
(147, 'error'),
(148, 'info'),
(149, 'success'),
(150, 'warning'),
(151, 'error'),
(152, 'info'),
(153, 'success'),
(154, 'warning'),
(155, 'error'),
(156, 'info'),
(157, 'success'),
(158, 'warning'),
(159, 'error'),
(160, 'info'),
(161, 'success'),
(162, 'warning'),
(163, 'error'),
(164, 'info'),
(165, 'success'),
(166, 'warning'),
(167, 'error'),
(168, 'info'),
(169, 'success'),
(170, 'warning'),
(171, 'error'),
(172, 'info'),
(173, 'success'),
(174, 'warning'),
(175, 'error'),
(176, 'info'),
(177, 'success'),
(178, 'warning'),
(179, 'error'),
(180, 'info'),
(181, 'success'),
(182, 'warning'),
(183, 'error'),
(184, 'info'),
(185, 'success'),
(186, 'warning'),
(187, 'error'),
(188, 'info'),
(189, 'success'),
(190, 'warning'),
(191, 'error'),
(192, 'info'),
(193, 'success'),
(194, 'warning'),
(195, 'error'),
(196, 'info'),
(197, 'success'),
(198, 'warning'),
(199, 'error'),
(200, 'info'),
(201, 'success'),
(202, 'warning'),
(203, 'error'),
(204, 'info'),
(205, 'success'),
(206, 'warning'),
(207, 'error'),
(208, 'info'),
(209, 'success'),
(210, 'warning'),
(211, 'error'),
(212, 'info'),
(213, 'success'),
(214, 'warning'),
(215, 'error'),
(216, 'info'),
(217, 'success'),
(218, 'warning'),
(219, 'error'),
(220, 'info'),
(221, 'success'),
(222, 'warning'),
(223, 'error'),
(224, 'info'),
(225, 'success'),
(226, 'warning'),
(227, 'error'),
(228, 'info'),
(229, 'success'),
(230, 'warning'),
(231, 'error'),
(232, 'info'),
(233, 'success'),
(234, 'warning'),
(235, 'error'),
(236, 'info'),
(237, 'success'),
(238, 'warning'),
(239, 'error'),
(240, 'info'),
(241, 'success'),
(242, 'warning'),
(243, 'error'),
(244, 'info'),
(245, 'success'),
(246, 'warning'),
(247, 'error'),
(248, 'info'),
(249, 'success'),
(250, 'warning'),
(251, 'error'),
(252, 'info'),
(253, 'success'),
(254, 'warning'),
(255, 'error'),
(256, 'info'),
(257, 'success'),
(258, 'warning'),
(259, 'error'),
(260, 'info'),
(261, 'success'),
(262, 'warning'),
(263, 'error'),
(264, 'info'),
(265, 'success'),
(266, 'warning'),
(267, 'error'),
(268, 'info'),
(269, 'success'),
(270, 'warning'),
(271, 'error'),
(272, 'info'),
(273, 'success'),
(274, 'warning'),
(275, 'error'),
(276, 'info'),
(277, 'success'),
(278, 'warning'),
(279, 'error'),
(280, 'info'),
(281, 'success'),
(282, 'warning'),
(283, 'error'),
(284, 'info'),
(285, 'success'),
(286, 'warning'),
(287, 'error'),
(288, 'info'),
(289, 'success'),
(290, 'warning'),
(291, 'error'),
(292, 'info'),
(293, 'success'),
(294, 'warning'),
(295, 'error'),
(296, 'info'),
(297, 'success'),
(298, 'warning'),
(299, 'error'),
(300, 'info'),
(301, 'success'),
(302, 'warning'),
(303, 'error'),
(304, 'info'),
(305, 'success'),
(306, 'warning'),
(307, 'error'),
(308, 'info'),
(309, 'success'),
(310, 'warning'),
(311, 'error'),
(312, 'info'),
(313, 'success'),
(314, 'warning'),
(315, 'error');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment`
--

CREATE TABLE `payment` (
  `id` int(11) NOT NULL,
  `subscription_id` int(11) DEFAULT NULL,
  `coach_request_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_intent_id` varchar(255) DEFAULT NULL,
  `payment_link_id` varchar(255) DEFAULT NULL,
  `status` enum('pending','paid','failed','cancelled','refunded') DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `payment_date` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `payment`
--

INSERT INTO `payment` (`id`, `subscription_id`, `coach_request_id`, `amount`, `payment_method`, `payment_intent_id`, `payment_link_id`, `status`, `created_at`, `updated_at`, `payment_date`) VALUES
(1, 1, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2025-11-26 11:01:13', NULL, '2025-11-26 11:01:13'),
(2, 2, NULL, 850.00, 'cash', NULL, NULL, 'paid', '2025-11-26 11:01:13', NULL, '2025-11-26 11:01:13'),
(3, 3, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2025-11-26 11:13:59', NULL, '2025-11-26 11:13:59'),
(4, 4, NULL, 999.00, 'cash', NULL, NULL, 'paid', '2025-11-26 11:13:59', NULL, '2025-11-26 11:13:59'),
(5, 5, NULL, 500.00, 'gcash', NULL, 'link_k7unj3ib69grsWoTzsNESL48', 'paid', '2025-11-26 11:17:31', '2025-11-26 03:17:54', '2025-11-26 11:17:54'),
(6, NULL, NULL, 300.00, 'cash', NULL, NULL, 'pending', '2025-11-26 11:19:22', NULL, '2025-11-26 11:19:22'),
(7, 6, NULL, 999.00, 'gcash', NULL, NULL, 'paid', '2025-11-26 11:33:28', NULL, '2025-11-26 11:33:28'),
(8, NULL, NULL, 3200.00, 'gcash', NULL, NULL, 'pending', '2025-11-26 11:37:25', NULL, '2025-11-26 11:37:25'),
(9, 7, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2025-11-26 11:38:53', NULL, '2025-11-26 11:38:53'),
(10, 8, NULL, 599.00, 'cash', NULL, NULL, 'paid', '2025-11-26 11:38:53', NULL, '2025-11-26 11:38:53'),
(11, 9, NULL, 150.00, 'cash', NULL, NULL, 'paid', '2025-11-26 11:59:58', NULL, '2025-11-26 11:59:58'),
(12, 10, NULL, 500.00, 'gcash', NULL, NULL, 'paid', '2025-11-26 13:11:06', NULL, '2025-11-26 13:11:06'),
(13, 11, NULL, 850.00, 'gcash', NULL, NULL, 'paid', '2025-11-26 13:11:06', NULL, '2025-11-26 13:11:06'),
(14, 12, NULL, 850.00, 'cash', NULL, NULL, 'paid', '2025-11-26 13:30:10', NULL, '2025-11-26 13:30:10'),
(15, 13, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2025-11-26 13:30:10', NULL, '2025-11-26 13:30:10'),
(16, NULL, 3, 3200.00, 'gcash', NULL, 'link_6zJasaLRrxU2NUjm8VtMyKP2', 'pending', '2025-11-26 05:44:12', NULL, '2025-11-26 05:44:12'),
(17, NULL, NULL, 3200.00, 'gcash', NULL, NULL, 'pending', '2025-11-26 13:49:22', NULL, '2025-11-26 13:49:22'),
(18, 12, NULL, 850.00, 'gcash', NULL, 'link_6JBEQpa5guwXfTo3XXtEunJv', 'paid', '2025-11-26 13:52:21', '2025-11-26 05:53:03', '2025-11-26 13:53:03'),
(19, 15, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2025-11-29 22:18:26', NULL, '2025-11-29 22:18:26'),
(20, 14, NULL, 850.00, 'cash', NULL, NULL, 'paid', '2025-11-29 22:18:26', NULL, '2025-11-29 22:18:26'),
(21, 16, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2025-11-29 22:21:50', NULL, '2025-11-29 22:21:50'),
(22, 17, NULL, 999.00, 'cash', NULL, NULL, 'paid', '2025-11-29 22:21:50', NULL, '2025-11-29 22:21:50'),
(23, 18, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2025-11-29 23:05:30', NULL, '2025-11-29 23:05:30'),
(24, 19, NULL, 999.00, 'cash', NULL, NULL, 'paid', '2025-11-29 23:05:30', NULL, '2025-11-29 23:05:30'),
(25, 21, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-23 01:57:19', NULL, '2026-01-23 01:57:19'),
(26, 22, NULL, 150.00, 'cash', NULL, NULL, 'paid', '2026-01-23 02:19:01', NULL, '2026-01-23 02:19:01'),
(27, 23, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-23 02:19:01', NULL, '2026-01-23 02:19:01'),
(28, 24, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-23 02:25:37', NULL, '2026-01-23 02:25:37'),
(29, 25, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-23 02:39:29', NULL, '2026-01-23 02:39:29'),
(30, 26, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-23 02:44:27', NULL, '2026-01-23 02:44:27'),
(31, 27, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-23 03:08:38', NULL, '2026-01-23 03:08:38'),
(32, 28, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-25 17:28:31', NULL, '2026-01-25 17:28:31'),
(33, 29, NULL, 850.00, 'cash', NULL, NULL, 'paid', '2026-01-25 17:28:31', NULL, '2026-01-25 17:28:31'),
(34, 30, NULL, 850.00, 'cash', NULL, NULL, 'paid', '2026-01-25 17:44:13', NULL, '2026-01-25 17:44:13'),
(35, 31, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-25 17:44:13', NULL, '2026-01-25 17:44:13'),
(36, 12, NULL, 850.00, 'gcash', NULL, 'link_B2LGSVm9F6Rnrf2J5EWEXQkb', 'cancelled', '2026-01-25 18:02:30', '2026-01-25 18:23:39', '2026-01-25 18:02:30'),
(37, 32, NULL, 150.00, 'cash', NULL, NULL, 'paid', '2026-01-26 13:47:12', NULL, '2026-01-26 13:47:12'),
(38, 33, NULL, 150.00, 'cash', NULL, NULL, 'paid', '2026-01-26 14:12:55', NULL, '2026-01-26 14:12:55'),
(39, 34, NULL, 150.00, 'cash', NULL, NULL, 'paid', '2026-01-26 14:20:06', NULL, '2026-01-26 14:20:06'),
(40, 35, NULL, 150.00, 'cash', NULL, NULL, 'paid', '2026-01-26 14:31:14', NULL, '2026-01-26 14:31:14'),
(41, 36, NULL, 150.00, 'cash', NULL, NULL, 'paid', '2026-01-26 14:41:15', NULL, '2026-01-26 14:41:15'),
(42, 37, NULL, 150.00, 'cash', NULL, NULL, 'paid', '2026-01-27 01:30:34', NULL, '2026-01-27 01:30:34'),
(43, 38, NULL, 150.00, 'cash', NULL, NULL, 'paid', '2026-01-27 01:40:46', NULL, '2026-01-27 01:40:46'),
(44, 39, NULL, 150.00, 'cash', NULL, NULL, 'paid', '2026-01-27 01:48:09', NULL, '2026-01-27 01:48:09'),
(45, 40, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-27 01:50:41', NULL, '2026-01-27 01:50:41'),
(46, 41, NULL, 850.00, 'cash', NULL, NULL, 'paid', '2026-01-27 01:50:41', NULL, '2026-01-27 01:50:41'),
(47, 42, NULL, 150.00, 'gcash', NULL, 'link_i2G8HM5fQtdmZCZ6hYRGwnFZ', 'cancelled', '2026-01-27 02:00:00', '2026-01-27 02:00:46', '2026-01-27 02:00:00'),
(48, 40, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-27 02:36:25', NULL, '2026-01-27 02:36:25'),
(49, NULL, NULL, 3200.00, 'cash', NULL, NULL, 'pending', '2026-01-27 02:37:05', NULL, '2026-01-27 02:37:05'),
(50, 43, NULL, 850.00, 'cash', NULL, NULL, 'paid', '2026-01-28 10:54:15', NULL, '2026-01-28 10:54:15'),
(51, 44, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-28 10:54:15', NULL, '2026-01-28 10:54:15'),
(52, 43, NULL, 850.00, 'gcash', NULL, 'link_1AG5xuGAwYv1jEkeKF4GoLKv', 'cancelled', '2026-01-28 11:06:59', '2026-01-28 11:07:27', '2026-01-28 11:06:59'),
(53, 45, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-30 13:52:09', NULL, '2026-01-30 13:52:09'),
(54, 46, NULL, 999.00, 'cash', NULL, NULL, 'paid', '2026-01-30 13:52:09', NULL, '2026-01-30 13:52:09'),
(55, 47, NULL, 999.00, 'cash', NULL, NULL, 'paid', '2026-01-30 14:25:31', NULL, '2026-01-30 14:25:31'),
(56, 48, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-30 14:25:31', NULL, '2026-01-30 14:25:31'),
(57, 49, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-30 15:26:01', NULL, '2026-01-30 15:26:01'),
(58, 50, NULL, 500.00, 'cash', NULL, NULL, 'paid', '2026-01-30 16:14:19', NULL, '2026-01-30 16:14:19'),
(59, 51, NULL, 999.00, 'cash', NULL, NULL, 'paid', '2026-01-30 16:14:19', NULL, '2026-01-30 16:14:19'),
(60, 52, NULL, 150.00, 'gcash', NULL, 'link_EcVB7wVAbU9EYzfywKyMdg2C', 'cancelled', '2026-01-31 12:54:24', '2026-01-31 12:54:46', '2026-01-31 12:54:24');

--
-- Triggers `payment`
--
DELIMITER $$
CREATE TRIGGER `notify_coach_payment_received` AFTER INSERT ON `payment` FOR EACH ROW BEGIN
    DECLARE member_name_var VARCHAR(255);
    DECLARE coach_id_var INT;
    DECLARE unread_status_id INT DEFAULT 1;
    DECLARE success_type_id INT DEFAULT 3;
    
    -- Only process if this is a coach payment (has coach_request_id)
    IF NEW.coach_request_id IS NOT NULL 
       AND NEW.status = 'paid' THEN
        
        -- Get coach_id and member_id from coach_member_list
        SELECT coach_id, member_id INTO coach_id_var, @member_id_var
        FROM coach_member_list
        WHERE id = NEW.coach_request_id;
        
        -- Get member name
        IF @member_id_var IS NOT NULL THEN
            SELECT CONCAT(COALESCE(fname, ''), ' ', COALESCE(lname, '')) INTO member_name_var
            FROM user
            WHERE id = @member_id_var;
        END IF;
        
        -- Get notification status and type IDs
        SELECT id INTO unread_status_id FROM notification_status WHERE status_name = 'Unread' LIMIT 1;
        IF unread_status_id IS NULL THEN SET unread_status_id = 1; END IF;
        
        SELECT id INTO success_type_id FROM notification_type WHERE type_name = 'success' LIMIT 1;
        IF success_type_id IS NULL THEN SET success_type_id = 3; END IF;
        
        -- Create notification for coach
        IF coach_id_var IS NOT NULL THEN
            INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
            VALUES (
                coach_id_var,
                CONCAT('Payment received from ', COALESCE(member_name_var, 'a member'), 
                       ' - ₱', FORMAT(NEW.amount, 2), ' for coaching services.'),
                unread_status_id,
                success_type_id,
                NOW()
            );
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `personal_records`
--

CREATE TABLE `personal_records` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `exercise_id` int(11) DEFAULT NULL,
  `max_weight` decimal(6,2) DEFAULT NULL,
  `achieved_on` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Triggers `personal_records`
--
DELIMITER $$
CREATE TRIGGER `notify_personal_record` AFTER INSERT ON `personal_records` FOR EACH ROW BEGIN
    DECLARE exercise_name_var VARCHAR(255);
    
    SELECT name INTO exercise_name_var
    FROM exercise 
    WHERE id = NEW.exercise_id;
    
    INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
    VALUES (
        NEW.user_id, 
        CONCAT('? NEW PERSONAL RECORD! ', COALESCE(exercise_name_var, 'Exercise'), ': ', NEW.max_weight, ' kg'),
        1, 
        6, 
        NOW()
    );
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL,
  `category` enum('Uncategorized','Beverages','Supplements','Snacks','Merch/Apparel','Accessories','Equipment') DEFAULT 'Uncategorized',
  `is_archived` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`id`, `name`, `price`, `stock`, `category`, `is_archived`) VALUES
(1, 'Vitamilk', 48.00, 49, 'Beverages', 0),
(2, 'Cnergy Shirt', 100.00, 34, 'Merch/Apparel', 0),
(3, 'Key Chain', 80.00, 8, 'Merch/Apparel', 0),
(4, 'Whey Gold Standard', 80.00, 13, 'Supplements', 0),
(5, 'Amino Capstule 1 per capsule', 10.00, 58, 'Supplements', 0),
(6, 'Cenergy Towel', 100.00, 11, 'Merch/Apparel', 0),
(7, 'Creatine', 35.00, 61, 'Supplements', 0),
(8, 'Cnergy Cap', 200.00, 1, 'Merch/Apparel', 0),
(9, 'Gatorade', 48.00, 84, 'Beverages', 0);

--
-- Triggers `product`
--
DELIMITER $$
CREATE TRIGGER `notify_product_added` AFTER INSERT ON `product` FOR EACH ROW BEGIN
    INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
    SELECT 
        u.id,
        CONCAT('New product added: "', NEW.name, '" (?', NEW.price, ') with ', NEW.stock, ' units in stock'),
        1, 
        1, 
        NOW()
    FROM `user` u 
    WHERE u.user_type_id = 1; 
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_stock_alert` AFTER UPDATE ON `product` FOR EACH ROW BEGIN
    
    IF NEW.stock < 20 AND OLD.stock >= 20 THEN
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        SELECT 
            u.id,
            CONCAT('Low stock alert: "', NEW.name, '" has only ', NEW.stock, ' units left'),
            1, 
            5, 
            NOW()
        FROM `user` u 
        WHERE u.user_type_id = 1; 
    END IF;

    
    IF ABS(NEW.stock - OLD.stock) >= 10 THEN
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        SELECT 
            u.id,
            CONCAT('Stock updated: "', NEW.name, '" changed from ', OLD.stock, ' to ', NEW.stock, ' units'),
            1, 
            1, 
            NOW()
        FROM `user` u 
        WHERE u.user_type_id = 1; 
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `programdetail`
--

CREATE TABLE `programdetail` (
  `id` int(11) NOT NULL,
  `program_hdr_id` int(11) DEFAULT NULL,
  `detail` text NOT NULL,
  `scheduled_day` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `programhdr`
--

CREATE TABLE `programhdr` (
  `id` int(11) NOT NULL,
  `program_id` int(11) DEFAULT NULL,
  `header_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `goal` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `difficulty` varchar(50) DEFAULT NULL,
  `total_sessions` int(11) DEFAULT 0,
  `scheduled_days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scheduled_days`)),
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `type` enum('template','custom') DEFAULT 'template',
  `name` varchar(255) NOT NULL DEFAULT 'Untitled Template',
  `duration` int(11) DEFAULT 30,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `programhdr`
--

INSERT INTO `programhdr` (`id`, `program_id`, `header_name`, `description`, `color`, `tags`, `goal`, `notes`, `difficulty`, `total_sessions`, `scheduled_days`, `created_by`, `created_at`, `updated_at`, `type`, `name`, `duration`, `is_active`) VALUES
(1, 1, 'Push Day', 'Push Day focuses on exercises that train all the muscles used for pushing movements: the chest, shoulders, and triceps. This workout is designed for beginners and helps build strength, improve form, and create a solid foundation for future training.', '#3B82F6', '[]', 'Push Day', 'Push Day focuses on exercises that train all the muscles used for pushing movements: the chest, shoulders, and triceps. This workout is designed for beginners and helps build strength, improve form, and create a solid foundation for future training.', 'Beginner', 0, '[]', 1, '2025-11-26 03:06:25', '2025-11-26 03:09:28', 'template', 'Push Day', 30, 1),
(3, 3, 'Pull Day', 'The Pull Day program focuses on strengthening the muscles of your back, biceps, and rear shoulders. This routine uses basic and effective pulling movements to help you improve posture, build a stronger back, and develop well-shaped arms.', '#3B82F6', '[]', 'Pull Day', 'The Pull Day program focuses on strengthening the muscles of your back, biceps, and rear shoulders. This routine uses basic and effective pulling movements to help you improve posture, build a stronger back, and develop well-shaped arms.', 'Beginner', 0, '[]', 1, '2025-11-26 03:26:01', '2025-11-26 03:26:01', 'template', 'Pull Day', 30, 1),
(4, 4, 'Leg Day', 'The Leg Day program targets all the major muscles in your lower body — including your quads, hamstrings, glutes, and calves. This routine uses safe and effective exercises that build strength, improve balance, and help you develop a solid foundation for overall fitness.', '#3B82F6', '[]', 'Leg Day', 'The Leg Day program targets all the major muscles in your lower body — including your quads, hamstrings, glutes, and calves. This routine uses safe and effective exercises that build strength, improve balance, and help you develop a solid foundation for overall fitness.', 'Beginner', 0, '[]', 1, '2025-11-26 03:27:31', '2025-11-26 03:27:31', 'template', 'Leg Day', 30, 1),
(5, 5, 'Arm Day', 'The Arm Day program is designed to help you build stronger, more defined biceps and triceps with simple exercises anyone can follow. This routine focuses on controlled movements that give you a great pump while improving arm strength and shape.', '#3B82F6', '[]', 'Arm Day', 'The Arm Day program is designed to help you build stronger, more defined biceps and triceps with simple exercises anyone can follow. This routine focuses on controlled movements that give you a great pump while improving arm strength and shape.', 'Intermediate', 0, '[]', 1, '2025-11-26 03:30:05', '2026-01-30 06:21:04', 'template', 'Arm Day', 30, 0),
(6, 6, 'Chest and Back Day', 'This program combines chest and back in one intense session, following Arnold’s classic training style. By pairing pushing (chest) and pulling (back) exercises together, you get a powerful pump, balanced upper-body development, and improved strength. Exercises are done in a smooth, back-and-forth sequence to keep your heart rate up and muscles fully engaged.', '#3B82F6', '[]', 'Chest and Back Day', 'This program combines chest and back in one intense session, following Arnold’s classic training style. By pairing pushing (chest) and pulling (back) exercises together, you get a powerful pump, balanced upper-body development, and improved strength. Exercises are done in a smooth, back-and-forth sequence to keep your heart rate up and muscles fully engaged.', 'Intermediate', 0, '[]', 1, '2025-11-26 03:32:10', '2026-01-30 06:21:08', 'template', 'Chest and Back Day', 30, 0);

-- --------------------------------------------------------

--
-- Table structure for table `programs`
--

CREATE TABLE `programs` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_archived` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `programs`
--

INSERT INTO `programs` (`id`, `name`, `description`, `is_archived`) VALUES
(1, 'Push Day', 'Push Day focuses on exercises that train all the muscles used for pushing movements: the chest, shoulders, and triceps. This workout is designed for beginners and helps build strength, improve form, and create a solid foundation for future training.', 0),
(3, 'Pull Day', 'The Pull Day program focuses on strengthening the muscles of your back, biceps, and rear shoulders. This routine uses basic and effective pulling movements to help you improve posture, build a stronger back, and develop well-shaped arms.', 0),
(4, 'Leg Day', 'The Leg Day program targets all the major muscles in your lower body — including your quads, hamstrings, glutes, and calves. This routine uses safe and effective exercises that build strength, improve balance, and help you develop a solid foundation for overall fitness.', 0),
(5, 'Arm Day', 'The Arm Day program is designed to help you build stronger, more defined biceps and triceps with simple exercises anyone can follow. This routine focuses on controlled movements that give you a great pump while improving arm strength and shape.', 1),
(6, 'Chest and Back Day', 'This program combines chest and back in one intense session, following Arnold’s classic training style. By pairing pushing (chest) and pulling (back) exercises together, you get a powerful pump, balanced upper-body development, and improved strength. Exercises are done in a smooth, back-and-forth sequence to keep your heart rate up and muscles fully engaged.', 1);

-- --------------------------------------------------------

--
-- Table structure for table `program_review`
--

CREATE TABLE `program_review` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `program_hdr_id` int(11) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `review` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `program_workout`
--

CREATE TABLE `program_workout` (
  `id` int(11) NOT NULL,
  `program_hdr_id` int(11) NOT NULL,
  `workout_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`workout_details`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `program_workout`
--

INSERT INTO `program_workout` (`id`, `program_hdr_id`, `workout_details`, `created_at`) VALUES
(1, 1, '{\"name\":\"Push Day\",\"description\":\"Push Day focuses on exercises that train all the muscles used for pushing movements: the chest, shoulders, and triceps. This workout is designed for beginners and helps build strength, improve form, and create a solid foundation for future training.\",\"difficulty\":\"Beginner\",\"goal\":\"Push Day\",\"duration\":\"30 days\",\"created_at\":\"2025-11-26 03:06:25\",\"is_template\":true,\"template_id\":\"1\"}', '2025-11-26 03:06:25'),
(3, 3, '{\"name\":\"Pull Day\",\"description\":\"The Pull Day program focuses on strengthening the muscles of your back, biceps, and rear shoulders. This routine uses basic and effective pulling movements to help you improve posture, build a stronger back, and develop well-shaped arms.\",\"difficulty\":\"Beginner\",\"goal\":\"Pull Day\",\"duration\":\"30 days\",\"created_at\":\"2025-11-26 03:26:01\",\"is_template\":true,\"template_id\":\"3\"}', '2025-11-26 03:26:01'),
(4, 4, '{\"name\":\"Leg Day\",\"description\":\"The Leg Day program targets all the major muscles in your lower body \\u2014 including your quads, hamstrings, glutes, and calves. This routine uses safe and effective exercises that build strength, improve balance, and help you develop a solid foundation for overall fitness.\",\"difficulty\":\"Beginner\",\"goal\":\"Leg Day\",\"duration\":\"30 days\",\"created_at\":\"2025-11-26 03:27:31\",\"is_template\":true,\"template_id\":\"4\"}', '2025-11-26 03:27:31'),
(5, 5, '{\"name\":\"Arm Day\",\"description\":\"The Arm Day program is designed to help you build stronger, more defined biceps and triceps with simple exercises anyone can follow. This routine focuses on controlled movements that give you a great pump while improving arm strength and shape.\",\"difficulty\":\"Intermediate\",\"goal\":\"Arm Day\",\"duration\":\"30 days\",\"created_at\":\"2025-11-26 03:30:05\",\"is_template\":true,\"template_id\":\"5\"}', '2025-11-26 03:30:05'),
(6, 6, '{\"name\":\"Chest and Back Day\",\"description\":\"This program combines chest and back in one intense session, following Arnold\\u2019s classic training style. By pairing pushing (chest) and pulling (back) exercises together, you get a powerful pump, balanced upper-body development, and improved strength. Exercises are done in a smooth, back-and-forth sequence to keep your heart rate up and muscles fully engaged.\",\"difficulty\":\"Intermediate\",\"goal\":\"Chest and Back Day\",\"duration\":\"30 days\",\"created_at\":\"2025-11-26 03:32:46\",\"is_template\":true,\"template_id\":\"6\"}', '2025-11-26 03:32:10');

-- --------------------------------------------------------

--
-- Table structure for table `program_workout_exercise`
--

CREATE TABLE `program_workout_exercise` (
  `id` int(11) NOT NULL,
  `program_workout_id` int(11) NOT NULL,
  `exercise_id` int(11) NOT NULL,
  `sets` int(11) DEFAULT 3,
  `reps` int(11) DEFAULT 10,
  `weight` decimal(8,2) DEFAULT 0.00,
  `rest_time` int(11) DEFAULT 60,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `program_workout_exercise`
--

INSERT INTO `program_workout_exercise` (`id`, `program_workout_id`, `exercise_id`, `sets`, `reps`, `weight`, `rest_time`, `notes`, `created_at`) VALUES
(69, 1, 16, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:06:25'),
(70, 1, 15, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:06:25'),
(71, 1, 70, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:06:25'),
(72, 1, 45, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:06:25'),
(73, 1, 26, 3, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:06:25'),
(76, 3, 23, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:26:01'),
(77, 3, 62, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:26:01'),
(78, 3, 27, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:26:01'),
(79, 3, 28, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:26:01'),
(80, 3, 49, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:26:01'),
(81, 4, 19, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:27:31'),
(82, 4, 33, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:27:31'),
(83, 4, 43, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:27:31'),
(84, 4, 38, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:27:31'),
(85, 5, 28, 3, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:30:05'),
(86, 5, 49, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:30:05'),
(87, 5, 45, 3, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:30:05'),
(88, 5, 56, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:30:05'),
(93, 6, 16, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:32:46'),
(94, 6, 66, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:32:46'),
(95, 6, 62, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:32:46'),
(96, 6, 23, 2, 0, 0.00, 60, 'Admin created exercise', '2025-11-26 03:32:46');

-- --------------------------------------------------------

--
-- Table structure for table `progress_tracker`
--

CREATE TABLE `progress_tracker` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `exercise_name` varchar(255) NOT NULL,
  `muscle_group` varchar(100) DEFAULT NULL,
  `weight` decimal(5,2) NOT NULL,
  `reps` int(11) NOT NULL,
  `sets` int(11) NOT NULL,
  `volume` decimal(10,2) DEFAULT NULL,
  `one_rep_max` decimal(5,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `program_name` varchar(255) DEFAULT NULL,
  `program_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `progress_tracking`
--

CREATE TABLE `progress_tracking` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `bmi` decimal(5,2) DEFAULT NULL,
  `chest_cm` decimal(5,2) DEFAULT NULL,
  `waist_cm` decimal(5,2) DEFAULT NULL,
  `hips_cm` decimal(5,2) DEFAULT NULL,
  `date_recorded` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `promotions`
--

CREATE TABLE `promotions` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Triggers `promotions`
--
DELIMITER $$
CREATE TRIGGER `notify_new_promotion` AFTER INSERT ON `promotions` FOR EACH ROW BEGIN
    IF NEW.is_active = 1 THEN
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        SELECT 
            u.id,
            CONCAT('?? New promotion: ', NEW.title, ' - ', NEW.description),
            1, 
            3, 
            NOW()
        FROM `user` u 
        WHERE u.user_type_id = 4; 
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `sale_date` datetime DEFAULT current_timestamp(),
  `sale_type` enum('Product','Subscription','Guest','Coaching') DEFAULT NULL,
  `payment_method` enum('cash','card','digital') DEFAULT 'cash',
  `transaction_status` enum('pending','confirmed','cancelled','refunded') DEFAULT 'confirmed',
  `receipt_number` varchar(50) DEFAULT NULL,
  `reference_number` varchar(50) DEFAULT NULL COMMENT 'PayMongo payment reference number',
  `cashier_id` int(11) DEFAULT NULL,
  `change_given` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`id`, `user_id`, `total_amount`, `sale_date`, `sale_type`, `payment_method`, `transaction_status`, `receipt_number`, `reference_number`, `cashier_id`, `change_given`, `notes`) VALUES
(1, NULL, 48.00, '2025-11-24 10:57:38', 'Product', 'cash', 'confirmed', 'RCP202511263987', NULL, 1, 2.00, ''),
(2, NULL, 100.00, '2025-10-25 10:57:57', 'Product', 'cash', 'confirmed', 'RCP202511268703', NULL, 1, 0.00, ''),
(3, NULL, 20.00, '2025-11-26 10:58:18', 'Product', 'cash', 'confirmed', 'RCP202511266115', NULL, 1, 0.00, ''),
(4, NULL, 160.00, '2025-11-26 10:58:34', 'Product', 'cash', 'confirmed', 'RCP202511269017', NULL, 1, 40.00, ''),
(5, 4, 500.00, '2024-11-26 11:01:13', 'Subscription', 'cash', 'confirmed', 'SUB202511261792', NULL, NULL, 150.00, NULL),
(6, 4, 850.00, '2025-11-26 11:01:13', 'Subscription', 'cash', 'confirmed', 'SUB202511261855', NULL, NULL, 94.44, NULL),
(7, 5, 500.00, '2025-11-26 11:13:59', 'Subscription', 'cash', 'confirmed', 'SUB202511269267', NULL, NULL, 1.00, NULL),
(8, 5, 999.00, '2025-11-26 11:13:59', 'Subscription', 'cash', 'confirmed', 'SUB202511263549', NULL, NULL, 0.67, NULL),
(9, 4, 500.00, '2025-11-26 11:17:31', 'Subscription', 'digital', 'confirmed', NULL, 'aBFpM9h', NULL, 0.00, NULL),
(10, NULL, 150.00, '2025-11-26 11:17:44', 'Guest', 'digital', 'confirmed', 'GST202511263417', '20349810116478', NULL, 0.00, ''),
(11, 4, 300.00, '2025-11-26 11:19:22', 'Coaching', 'cash', 'confirmed', 'RCP20251126686880', NULL, 1, 0.00, ''),
(12, NULL, 150.00, '2025-11-26 11:20:13', 'Guest', 'cash', 'confirmed', 'GST202511260098', NULL, NULL, 0.00, ''),
(13, NULL, 150.00, '2025-11-26 11:20:47', 'Guest', 'digital', 'confirmed', 'GST202511263396', 'DiFMTCj', NULL, 0.00, ''),
(14, 7, 999.00, '2025-11-26 11:33:28', 'Subscription', '', 'confirmed', 'SUB202511263785', '2035074259085', NULL, 0.00, NULL),
(15, 5, 3200.00, '2025-11-26 11:37:25', 'Coaching', '', 'confirmed', NULL, '20234923829', 1, 0.00, ''),
(16, 8, 500.00, '2025-11-26 11:38:53', 'Subscription', 'cash', 'confirmed', 'SUB202511268879', NULL, NULL, 901.00, NULL),
(17, 8, 599.00, '2025-11-26 11:38:53', 'Subscription', 'cash', 'confirmed', 'SUB202511268008', NULL, NULL, 491.08, NULL),
(18, 9, 150.00, '2025-11-26 11:59:58', 'Subscription', 'cash', 'confirmed', 'SUB202511265638', NULL, NULL, 0.00, NULL),
(19, 10, 500.00, '2025-11-26 13:11:06', 'Subscription', '', 'confirmed', 'SUB202511268353', '0534810384834', NULL, 0.00, NULL),
(20, 10, 850.00, '2025-11-26 13:11:06', 'Subscription', '', 'confirmed', 'SUB202511268212', '0534810384834', NULL, 0.00, NULL),
(21, 11, 850.00, '2025-11-26 13:30:10', 'Subscription', 'cash', 'confirmed', 'SUB202511264055', NULL, NULL, 94.44, NULL),
(22, 11, 500.00, '2025-11-26 13:30:10', 'Subscription', 'cash', 'confirmed', 'SUB202511266883', NULL, NULL, 150.00, NULL),
(23, 11, 3200.00, '2025-11-26 13:49:22', 'Coaching', '', 'confirmed', NULL, '20301003841213', 1, 0.00, ''),
(24, 11, 850.00, '2025-11-26 13:52:21', 'Subscription', 'digital', 'confirmed', NULL, 'DS7tJB9', NULL, 0.00, NULL),
(25, 12, 500.00, '2025-11-29 22:18:26', 'Subscription', 'cash', 'confirmed', 'SUB202511292270', NULL, NULL, 150.00, NULL),
(26, 12, 850.00, '2025-11-29 22:18:26', 'Subscription', 'cash', 'confirmed', 'SUB202511299394', NULL, NULL, 94.44, NULL),
(27, 13, 500.00, '2025-11-29 22:21:50', 'Subscription', 'cash', 'confirmed', 'SUB202511293411', NULL, NULL, 91.00, NULL),
(28, 13, 999.00, '2025-11-29 22:21:50', 'Subscription', 'cash', 'confirmed', 'SUB202511291885', NULL, NULL, 60.65, NULL),
(29, 14, 500.00, '2025-11-29 23:05:30', 'Subscription', 'cash', 'confirmed', 'SUB202511298571', NULL, NULL, 1.00, NULL),
(30, 14, 999.00, '2025-11-29 23:05:30', 'Subscription', 'cash', 'confirmed', 'SUB202511298095', NULL, NULL, 0.67, NULL),
(31, NULL, 150.00, '2026-01-20 07:53:01', 'Guest', 'digital', 'confirmed', NULL, 'hqWNRyw', NULL, 0.00, NULL),
(32, 15, 500.00, '2026-01-23 01:57:19', 'Subscription', 'cash', 'confirmed', 'SUB202601234217', NULL, NULL, 0.00, NULL),
(33, 16, 150.00, '2026-01-23 02:19:01', 'Subscription', 'cash', 'confirmed', 'SUB202601231374', NULL, NULL, 4350.00, NULL),
(34, 16, 500.00, '2026-01-23 02:19:01', 'Subscription', 'cash', 'confirmed', 'SUB202601239510', NULL, NULL, 3346.15, NULL),
(35, 17, 500.00, '2026-01-23 02:25:37', 'Subscription', 'cash', 'confirmed', 'SUB202601232692', NULL, NULL, 4500.00, NULL),
(36, 18, 500.00, '2026-01-23 02:39:29', 'Subscription', 'cash', 'confirmed', 'SUB202601237290', NULL, NULL, 500.00, NULL),
(37, 19, 500.00, '2026-01-23 02:44:27', 'Subscription', 'cash', 'confirmed', 'SUB202601231668', NULL, NULL, 500.00, NULL),
(38, 20, 500.00, '2026-01-23 03:08:38', 'Subscription', 'cash', 'confirmed', 'SUB202601238717', NULL, NULL, 500.00, NULL),
(39, 21, 500.00, '2026-01-25 17:28:31', 'Subscription', 'cash', 'confirmed', 'SUB202601253938', NULL, NULL, 150.00, NULL),
(40, 21, 850.00, '2026-01-25 17:28:31', 'Subscription', 'cash', 'confirmed', 'SUB202601256205', NULL, NULL, 94.44, NULL),
(41, 22, 850.00, '2026-01-25 17:44:13', 'Subscription', 'cash', 'confirmed', 'SUB202601250691', NULL, NULL, 8594.30, NULL),
(42, 22, 500.00, '2026-01-25 17:44:13', 'Subscription', 'cash', 'confirmed', 'SUB202601257099', NULL, NULL, 13649.77, NULL),
(43, 11, 850.00, '2026-01-25 18:02:30', 'Subscription', 'digital', 'confirmed', NULL, 'WnhLZaZ', NULL, 0.00, NULL),
(44, 23, 150.00, '2026-01-26 13:47:12', 'Subscription', 'cash', 'confirmed', 'SUB202601268034', NULL, NULL, 50.00, NULL),
(45, 24, 150.00, '2026-01-26 14:12:55', 'Subscription', 'cash', 'confirmed', 'SUB202601264818', NULL, NULL, 50.00, NULL),
(46, 25, 150.00, '2026-01-26 14:20:06', 'Subscription', 'cash', 'confirmed', 'SUB202601268584', NULL, NULL, 350.00, NULL),
(47, 26, 150.00, '2026-01-26 14:31:14', 'Subscription', 'cash', 'confirmed', 'SUB202601268112', NULL, NULL, 350.00, NULL),
(48, 27, 150.00, '2026-01-26 14:41:15', 'Subscription', 'cash', 'confirmed', 'SUB202601260837', NULL, NULL, 4850.00, NULL),
(49, 28, 150.00, '2026-01-27 01:30:34', 'Subscription', 'cash', 'confirmed', 'SUB202601279924', NULL, NULL, 50.00, NULL),
(50, 29, 150.00, '2026-01-27 01:40:46', 'Subscription', 'cash', 'confirmed', 'SUB202601278111', NULL, NULL, 50.00, NULL),
(51, 30, 150.00, '2026-01-27 01:48:09', 'Subscription', 'cash', 'confirmed', 'SUB202601278800', NULL, NULL, 4850.00, NULL),
(52, 31, 500.00, '2026-01-27 01:50:41', 'Subscription', 'cash', 'confirmed', 'SUB202601279030', NULL, NULL, 150.00, NULL),
(53, 31, 850.00, '2026-01-27 01:50:41', 'Subscription', 'cash', 'confirmed', 'SUB202601271294', NULL, NULL, 94.44, NULL),
(54, 11, 150.00, '2026-01-27 02:00:00', 'Subscription', 'digital', 'confirmed', NULL, 'fHZvaWr', NULL, 0.00, NULL),
(55, NULL, 150.00, '2026-01-27 02:25:14', 'Guest', 'cash', 'confirmed', 'GST202601270851', NULL, NULL, 50.00, ''),
(56, NULL, 150.00, '2026-01-27 02:25:40', 'Guest', 'cash', 'confirmed', 'GST202601271244', NULL, NULL, 50.00, ''),
(57, NULL, 240.00, '2026-01-27 02:27:04', 'Product', 'cash', 'confirmed', 'RCP202601275277', NULL, 2, 260.00, ''),
(58, 31, 500.00, '2026-01-27 02:36:25', 'Subscription', 'cash', 'confirmed', 'SUB2026012702362564301', NULL, NULL, 0.00, NULL),
(59, 14, 3200.00, '2026-01-27 02:37:05', 'Coaching', 'cash', 'confirmed', 'RCP20260127275413', NULL, 2, 1799.73, ''),
(60, NULL, 400.00, '2026-01-27 02:38:19', 'Product', 'cash', 'confirmed', 'RCP202601278967', NULL, 2, 1600.00, ''),
(61, NULL, 400.00, '2026-01-27 15:05:19', 'Product', 'cash', 'confirmed', 'RCP202601274377', NULL, 2, 2600.00, ''),
(62, 32, 850.00, '2026-01-28 10:54:15', 'Subscription', 'cash', 'confirmed', 'SUB202601280488', NULL, NULL, 94.44, NULL),
(63, 32, 500.00, '2026-01-28 10:54:15', 'Subscription', 'cash', 'confirmed', 'SUB202601283881', NULL, NULL, 150.00, NULL),
(64, NULL, 144.00, '2026-01-28 11:01:55', 'Product', 'cash', 'confirmed', 'RCP202601283003', NULL, 1, 56.00, ''),
(65, 32, 850.00, '2026-01-28 11:06:59', 'Subscription', 'digital', 'confirmed', NULL, 'ZqNDhwu', NULL, 0.00, NULL),
(66, 33, 999.00, '2026-01-30 13:52:09', 'Subscription', 'cash', 'confirmed', 'SUB202601309840', NULL, NULL, 0.67, NULL),
(67, 33, 500.00, '2026-01-30 13:52:09', 'Subscription', 'cash', 'confirmed', 'SUB202601300806', NULL, NULL, 1.00, NULL),
(68, 34, 999.00, '2026-01-30 14:25:31', 'Subscription', 'cash', 'confirmed', 'SUB202601306107', NULL, NULL, 2333.22, NULL),
(69, 34, 500.00, '2026-01-30 14:25:31', 'Subscription', 'cash', 'confirmed', 'SUB202601308130', NULL, NULL, 3501.00, NULL),
(70, 35, 500.00, '2026-01-30 15:26:01', 'Subscription', 'cash', 'confirmed', 'SUB202601304475', NULL, NULL, 4500.00, NULL),
(71, NULL, 140.00, '2026-01-30 15:26:36', 'Product', 'cash', 'confirmed', 'RCP202601308152', NULL, 1, 60.00, ''),
(72, 36, 500.00, '2026-01-30 16:14:19', 'Subscription', 'cash', 'confirmed', 'SUB202601301091', NULL, NULL, 2501.00, NULL),
(73, 36, 999.00, '2026-01-30 16:14:19', 'Subscription', 'cash', 'confirmed', 'SUB202601303103', NULL, NULL, 1666.78, NULL),
(74, 11, 150.00, '2026-01-31 12:54:24', 'Subscription', 'digital', 'confirmed', NULL, '7kL4ToQ', NULL, 0.00, NULL);

--
-- Triggers `sales`
--
DELIMITER $$
CREATE TRIGGER `notify_sale_recorded` AFTER INSERT ON `sales` FOR EACH ROW BEGIN
    DECLARE unread_status_id INT DEFAULT 1;
    DECLARE sale_type_id INT DEFAULT 2; -- Assuming 2 is for 'sale' or 'alert' type
    
    -- Get unread status ID
    SELECT id INTO unread_status_id
    FROM notification_status
    WHERE status_name = 'Unread'
    LIMIT 1;
    
    -- Get sale notification type ID (or use default)
    SELECT id INTO sale_type_id
    FROM notification_type
    WHERE type_name IN ('sale', 'alert', 'info')
    LIMIT 1;
    
    -- Only create notifications for Admin (user_type_id = 1) and Staff (user_type_id = 2 or 3)
    -- Do NOT create notifications for regular users (user_type_id = 4)
    INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
    SELECT 
        u.id,
        CONCAT('New sale recorded: ₱', FORMAT(NEW.total_amount, 2)),
        COALESCE(unread_status_id, 1),
        COALESCE(sale_type_id, 2),
        NOW()
    FROM `user` u
    WHERE u.user_type_id IN (1, 2, 3)  -- Only Admin and Staff
    AND u.account_status = 'approved';
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_sales` AFTER INSERT ON `sales` FOR EACH ROW BEGIN
    INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
    SELECT 
        u.id,
        CONCAT('New sale recorded: ?', NEW.total_amount),
        1, 
        2, 
        NOW()
    FROM `user` u 
    WHERE u.user_type_id = 1; 
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `sales_details`
--

CREATE TABLE `sales_details` (
  `id` int(11) NOT NULL,
  `sale_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `subscription_id` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `guest_session_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `sales_details`
--

INSERT INTO `sales_details` (`id`, `sale_id`, `product_id`, `subscription_id`, `quantity`, `price`, `guest_session_id`) VALUES
(1, 1, 1, NULL, 1, 48.00, NULL),
(2, 2, 6, NULL, 1, 100.00, NULL),
(3, 3, 5, NULL, 2, 20.00, NULL),
(4, 4, 4, NULL, 2, 160.00, NULL),
(5, 5, NULL, 1, 1, 500.00, NULL),
(6, 6, NULL, 2, 1, 850.00, NULL),
(7, 7, NULL, 3, 1, 500.00, NULL),
(8, 8, NULL, 4, 1, 999.00, NULL),
(9, 9, NULL, 5, 1, 500.00, NULL),
(10, 10, NULL, NULL, 1, 150.00, 1),
(11, 11, NULL, NULL, 1, 300.00, NULL),
(12, 12, NULL, NULL, 1, 150.00, 2),
(13, 13, NULL, NULL, 1, 150.00, 3),
(14, 14, NULL, 6, 1, 999.00, NULL),
(15, 15, NULL, NULL, 1, 3200.00, NULL),
(16, 16, NULL, 7, 1, 500.00, NULL),
(17, 17, NULL, 8, 1, 599.00, NULL),
(18, 18, NULL, 9, 1, 150.00, NULL),
(19, 19, NULL, 10, 1, 500.00, NULL),
(20, 20, NULL, 11, 1, 850.00, NULL),
(21, 21, NULL, 12, 1, 850.00, NULL),
(22, 22, NULL, 13, 1, 500.00, NULL),
(23, 23, NULL, NULL, 1, 3200.00, NULL),
(24, 24, NULL, 12, 1, 850.00, NULL),
(25, 25, NULL, 15, 1, 500.00, NULL),
(26, 26, NULL, 14, 1, 850.00, NULL),
(27, 27, NULL, 16, 1, 500.00, NULL),
(28, 28, NULL, 17, 1, 999.00, NULL),
(29, 29, NULL, 18, 1, 500.00, NULL),
(30, 30, NULL, 19, 1, 999.00, NULL),
(31, 32, NULL, 21, 1, 500.00, NULL),
(32, 33, NULL, 22, 1, 150.00, NULL),
(33, 34, NULL, 23, 1, 500.00, NULL),
(34, 35, NULL, 24, 1, 500.00, NULL),
(35, 36, NULL, 25, 1, 500.00, NULL),
(36, 37, NULL, 26, 1, 500.00, NULL),
(37, 38, NULL, 27, 1, 500.00, NULL),
(38, 39, NULL, 28, 1, 500.00, NULL),
(39, 40, NULL, 29, 1, 850.00, NULL),
(40, 41, NULL, 30, 1, 850.00, NULL),
(41, 42, NULL, 31, 1, 500.00, NULL),
(42, 43, NULL, 12, 1, 850.00, NULL),
(43, 44, NULL, 32, 1, 150.00, NULL),
(44, 45, NULL, 33, 1, 150.00, NULL),
(45, 46, NULL, 34, 1, 150.00, NULL),
(46, 47, NULL, 35, 1, 150.00, NULL),
(47, 48, NULL, 36, 1, 150.00, NULL),
(48, 49, NULL, 37, 1, 150.00, NULL),
(49, 50, NULL, 38, 1, 150.00, NULL),
(50, 51, NULL, 39, 1, 150.00, NULL),
(51, 52, NULL, 40, 1, 500.00, NULL),
(52, 53, NULL, 41, 1, 850.00, NULL),
(53, 54, NULL, 42, 1, 150.00, NULL),
(54, 55, NULL, NULL, 1, 150.00, 14),
(55, 56, NULL, NULL, 1, 150.00, 15),
(56, 57, 9, NULL, 5, 240.00, NULL),
(57, 58, NULL, 40, 1, 500.00, NULL),
(58, 59, NULL, NULL, 1, 3200.00, NULL),
(59, 60, 8, NULL, 2, 400.00, NULL),
(60, 61, 8, NULL, 2, 400.00, NULL),
(61, 62, NULL, 43, 1, 850.00, NULL),
(62, 63, NULL, 44, 1, 500.00, NULL),
(63, 64, 9, NULL, 3, 144.00, NULL),
(64, 65, NULL, 43, 1, 850.00, NULL),
(65, 66, NULL, 46, 1, 999.00, NULL),
(66, 67, NULL, 45, 1, 500.00, NULL),
(67, 68, NULL, 47, 1, 999.00, NULL),
(68, 69, NULL, 48, 1, 500.00, NULL),
(69, 70, NULL, 49, 1, 500.00, NULL),
(70, 71, 7, NULL, 4, 140.00, NULL),
(71, 72, NULL, 50, 1, 500.00, NULL),
(72, 73, NULL, 51, 1, 999.00, NULL),
(73, 74, NULL, 52, 1, 150.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `subscription`
--

CREATE TABLE `subscription` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `plan_id` int(11) DEFAULT NULL,
  `discount_type` enum('none','student','senior','promo') DEFAULT 'none',
  `status_id` int(11) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `discounted_price` decimal(10,2) DEFAULT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','card','digital') DEFAULT 'cash',
  `receipt_number` varchar(50) DEFAULT NULL,
  `cashier_id` int(11) DEFAULT NULL,
  `change_given` decimal(10,2) DEFAULT 0.00,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `subscription`
--

INSERT INTO `subscription` (`id`, `user_id`, `plan_id`, `discount_type`, `status_id`, `start_date`, `end_date`, `discounted_price`, `amount_paid`, `payment_method`, `receipt_number`, `cashier_id`, `change_given`, `created_at`) VALUES
(1, 4, 1, 'student', 5, '2024-11-26', '2025-11-26', 500.00, 500.00, 'cash', 'SUB202511261792', NULL, 150.00, '2024-11-26 11:01:13'),
(2, 4, 2, 'student', 5, '2025-10-27', '2025-11-26', 850.00, 850.00, 'cash', 'SUB202511261855', NULL, 94.44, '2025-11-26 11:01:13'),
(3, 5, 1, 'none', 2, '2025-11-26', '2026-11-26', 500.00, 500.00, 'cash', 'SUB202511269267', NULL, 1.00, '2025-11-26 11:13:59'),
(4, 5, 2, 'none', 2, '2025-11-26', '2025-12-26', 999.00, 999.00, 'cash', 'SUB202511263549', NULL, 0.67, '2025-11-26 11:13:59'),
(5, 4, 1, 'student', 2, '2025-11-26', '2026-11-26', NULL, 500.00, 'cash', NULL, NULL, 0.00, '2025-11-26 11:17:31'),
(6, 7, 3, 'student', 2, '2025-11-26', '2025-12-26', 999.00, 999.00, '', 'SUB202511263785', NULL, 0.00, '2025-11-26 11:33:28'),
(7, 8, 1, 'senior', 2, '2025-11-26', '2026-11-26', 500.00, 500.00, 'cash', 'SUB202511268879', NULL, 901.00, '2025-11-26 11:38:53'),
(8, 8, 2, 'senior', 2, '2025-11-26', '2025-12-26', 599.00, 599.00, 'cash', 'SUB202511268008', NULL, 491.08, '2025-11-26 11:38:53'),
(9, 9, 6, 'student', 2, '2025-11-26', '2025-11-26', 150.00, 150.00, 'cash', 'SUB202511265638', NULL, 0.00, '2025-11-26 11:59:58'),
(10, 10, 1, 'student', 2, '2025-11-26', '2026-11-26', 500.00, 500.00, '', 'SUB202511268353', NULL, 0.00, '2025-11-26 13:11:06'),
(11, 10, 2, 'student', 2, '2025-11-26', '2025-12-26', 850.00, 850.00, '', 'SUB202511268212', NULL, 0.00, '2025-11-26 13:11:06'),
(12, 11, 2, 'student', 2, '2025-11-26', '2026-01-25', 850.00, 1700.00, 'cash', 'SUB202511264055', NULL, 94.44, '2025-11-26 13:30:10'),
(13, 11, 1, 'student', 2, '2025-11-26', '2026-11-26', 500.00, 500.00, 'cash', 'SUB202511266883', NULL, 150.00, '2025-11-26 13:30:10'),
(14, 12, 2, 'student', 2, '2025-11-29', '2025-12-29', 850.00, 850.00, 'cash', 'SUB202511299394', NULL, 94.44, '2025-11-29 22:18:26'),
(15, 12, 1, 'student', 2, '2025-11-29', '2026-11-29', 500.00, 500.00, 'cash', 'SUB202511292270', NULL, 150.00, '2025-11-29 22:18:26'),
(16, 13, 1, 'none', 2, '2025-11-29', '2026-11-29', 500.00, 500.00, 'cash', 'SUB202511293411', NULL, 91.00, '2025-11-29 22:21:50'),
(17, 13, 2, 'none', 2, '2025-11-29', '2025-12-29', 999.00, 999.00, 'cash', 'SUB202511291885', NULL, 60.65, '2025-11-29 22:21:50'),
(18, 14, 1, 'none', 2, '2025-11-29', '2026-11-29', 500.00, 500.00, 'cash', 'SUB202511298571', NULL, 1.00, '2025-11-29 23:05:30'),
(19, 14, 2, 'none', 2, '2025-11-29', '2025-12-29', 999.00, 999.00, 'cash', 'SUB202511298095', NULL, 0.67, '2025-11-29 23:05:30'),
(20, 11, 1, 'student', 4, '2026-11-26', '2027-11-26', NULL, 500.00, 'cash', NULL, NULL, 0.00, NULL),
(21, 15, 1, 'none', 2, '2026-01-22', '2027-01-22', 500.00, 500.00, 'cash', 'SUB202601234217', NULL, 0.00, '2026-01-23 01:57:19'),
(22, 16, 6, 'none', 2, '2026-01-23', '2026-01-23', 150.00, 150.00, 'cash', 'SUB202601231374', NULL, 4350.00, '2026-01-23 02:19:01'),
(23, 16, 1, 'none', 2, '2026-01-22', '2027-01-22', 500.00, 500.00, 'cash', 'SUB202601239510', NULL, 3346.15, '2026-01-23 02:19:01'),
(24, 17, 1, 'none', 2, '2026-01-22', '2027-01-22', 500.00, 500.00, 'cash', 'SUB202601232692', NULL, 4500.00, '2026-01-23 02:25:37'),
(25, 18, 1, 'none', 2, '2026-01-22', '2027-01-22', 500.00, 500.00, 'cash', 'SUB202601237290', NULL, 500.00, '2026-01-23 02:39:29'),
(26, 19, 1, 'none', 2, '2026-01-22', '2027-01-22', 500.00, 500.00, 'cash', 'SUB202601231668', NULL, 500.00, '2026-01-23 02:44:27'),
(27, 20, 1, 'none', 2, '2026-01-22', '2027-01-22', 500.00, 500.00, 'cash', 'SUB202601238717', NULL, 500.00, '2026-01-23 03:08:38'),
(28, 21, 1, 'student', 2, '2026-01-25', '2027-01-25', 500.00, 500.00, 'cash', 'SUB202601253938', NULL, 150.00, '2026-01-25 17:28:31'),
(29, 21, 2, 'student', 2, '2026-01-25', '2026-02-25', 850.00, 850.00, 'cash', 'SUB202601256205', NULL, 94.44, '2026-01-25 17:28:31'),
(30, 22, 2, 'student', 2, '2026-01-25', '2026-02-25', 850.00, 850.00, 'cash', 'SUB202601250691', NULL, 8594.30, '2026-01-25 17:44:13'),
(31, 22, 1, 'student', 2, '2026-01-25', '2027-01-25', 500.00, 500.00, 'cash', 'SUB202601257099', NULL, 13649.77, '2026-01-25 17:44:13'),
(32, 23, 6, 'none', 2, '2026-01-26', '2026-01-26', 150.00, 150.00, 'cash', 'SUB202601268034', NULL, 50.00, '2026-01-26 13:47:12'),
(33, 24, 6, 'none', 2, '2026-01-26', '2026-01-26', 150.00, 150.00, 'cash', 'SUB202601264818', NULL, 50.00, '2026-01-26 14:12:55'),
(34, 25, 6, 'none', 2, '2026-01-26', '2026-01-26', 150.00, 150.00, 'cash', 'SUB202601268584', NULL, 350.00, '2026-01-26 14:20:06'),
(35, 26, 6, 'none', 2, '2026-01-26', '2026-01-26', 150.00, 150.00, 'cash', 'SUB202601268112', NULL, 350.00, '2026-01-26 14:31:14'),
(36, 27, 6, 'none', 2, '2026-01-26', '2026-01-26', 150.00, 150.00, 'cash', 'SUB202601260837', NULL, 4850.00, '2026-01-26 14:41:15'),
(37, 28, 6, 'none', 2, '2026-01-27', '2026-01-27', 150.00, 150.00, 'cash', 'SUB202601279924', NULL, 50.00, '2026-01-27 01:30:34'),
(38, 29, 6, 'none', 2, '2026-01-27', '2026-01-27', 150.00, 150.00, 'cash', 'SUB202601278111', NULL, 50.00, '2026-01-27 01:40:46'),
(39, 30, 6, 'none', 2, '2026-01-27', '2026-01-27', 150.00, 150.00, 'cash', 'SUB202601278800', NULL, 4850.00, '2026-01-27 01:48:09'),
(40, 31, 1, 'student', 2, '2026-01-26', '2028-01-26', 1000.00, 1000.00, 'cash', 'SUB202601279030', NULL, 150.00, '2026-01-27 01:50:41'),
(41, 31, 2, 'student', 2, '2026-01-26', '2026-02-26', 850.00, 850.00, 'cash', 'SUB202601271294', NULL, 94.44, '2026-01-27 01:50:41'),
(42, 11, 6, 'student', 4, '2026-11-26', '2026-11-27', NULL, 150.00, 'cash', NULL, NULL, 0.00, '2026-01-27 02:00:00'),
(43, 32, 2, 'student', 2, '2026-01-28', '2026-02-28', 850.00, 850.00, 'cash', 'SUB202601280488', NULL, 94.44, '2026-01-28 10:54:15'),
(44, 32, 1, 'student', 2, '2026-01-28', '2027-01-28', 500.00, 500.00, 'cash', 'SUB202601283881', NULL, 150.00, '2026-01-28 10:54:15'),
(45, 33, 1, 'none', 2, '2026-01-30', '2027-01-30', 500.00, 500.00, 'cash', 'SUB202601300806', NULL, 1.00, '2026-01-30 13:52:09'),
(46, 33, 2, 'none', 2, '2026-01-30', '2026-03-02', 999.00, 999.00, 'cash', 'SUB202601309840', NULL, 0.67, '2026-01-30 13:52:09'),
(47, 34, 2, 'none', 2, '2026-01-30', '2026-03-02', 999.00, 999.00, 'cash', 'SUB202601306107', NULL, 2333.22, '2026-01-30 14:25:31'),
(48, 34, 1, 'none', 2, '2026-01-30', '2027-01-30', 500.00, 500.00, 'cash', 'SUB202601308130', NULL, 3501.00, '2026-01-30 14:25:31'),
(49, 35, 1, 'none', 2, '2026-01-30', '2027-01-30', 500.00, 500.00, 'cash', 'SUB202601304475', NULL, 4500.00, '2026-01-30 15:26:01'),
(50, 36, 1, 'none', 2, '2026-01-30', '2027-01-30', 500.00, 500.00, 'cash', 'SUB202601301091', NULL, 2501.00, '2026-01-30 16:14:19'),
(51, 36, 2, 'none', 2, '2026-01-30', '2026-03-02', 999.00, 999.00, 'cash', 'SUB202601303103', NULL, 1666.78, '2026-01-30 16:14:19'),
(52, 11, 6, 'student', 4, '2026-11-26', '2026-11-27', NULL, 150.00, 'cash', NULL, NULL, 0.00, '2026-01-31 12:54:24');

--
-- Triggers `subscription`
--
DELIMITER $$
CREATE TRIGGER `notify_subscription_expired` AFTER UPDATE ON `subscription` FOR EACH ROW BEGIN
    DECLARE plan_name VARCHAR(255);
    
    IF NEW.end_date IS NOT NULL THEN
        IF NEW.end_date < CURDATE() AND (OLD.end_date IS NULL OR OLD.end_date >= CURDATE()) THEN
            SELECT plan_name INTO plan_name FROM member_subscription_plan WHERE id = NEW.plan_id;
            
            INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
            VALUES (
                NEW.user_id, 
                CONCAT('Your ', COALESCE(plan_name, 'membership'), ' has expired. Renew now to reactivate your premium features!'),
                1, 2, NOW()
            );
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_subscription_expiry_1day` AFTER UPDATE ON `subscription` FOR EACH ROW BEGIN
    DECLARE plan_name VARCHAR(255);
    
    IF NEW.end_date IS NOT NULL AND OLD.end_date IS NOT NULL THEN
        IF DATEDIFF(NEW.end_date, CURDATE()) = 1 AND NEW.end_date > CURDATE() THEN
            SELECT plan_name INTO plan_name FROM member_subscription_plan WHERE id = NEW.plan_id;
            
            INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
            VALUES (
                NEW.user_id, 
                CONCAT('FINAL WARNING: Your ', COALESCE(plan_name, 'membership'), ' expires TOMORROW! Renew now to keep your progress!'),
                1, 2, NOW()
            );
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_subscription_expiry_3days` AFTER UPDATE ON `subscription` FOR EACH ROW BEGIN
    DECLARE plan_name VARCHAR(255);
    
    IF NEW.end_date IS NOT NULL AND OLD.end_date IS NOT NULL THEN
        IF DATEDIFF(NEW.end_date, CURDATE()) = 3 AND NEW.end_date > CURDATE() THEN
            SELECT plan_name INTO plan_name FROM member_subscription_plan WHERE id = NEW.plan_id;
            
            INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
            VALUES (
                NEW.user_id, 
                CONCAT('URGENT: Your ', COALESCE(plan_name, 'membership'), ' expires in 3 days! Renew immediately to avoid service interruption.'),
                1, 2, NOW()
            );
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_subscription_expiry_7days` AFTER UPDATE ON `subscription` FOR EACH ROW BEGIN
    DECLARE plan_name VARCHAR(255);
    
    IF NEW.end_date IS NOT NULL AND OLD.end_date IS NOT NULL THEN
        IF DATEDIFF(NEW.end_date, CURDATE()) = 7 AND NEW.end_date > CURDATE() THEN
            SELECT plan_name INTO plan_name FROM member_subscription_plan WHERE id = NEW.plan_id;
            
            INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
            VALUES (
                NEW.user_id, 
                CONCAT('Your ', COALESCE(plan_name, 'membership'), ' expires in 7 days. Renew now to continue enjoying all premium features!'),
                1, 8, NOW()
            );
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_subscription_extended` AFTER UPDATE ON `subscription` FOR EACH ROW BEGIN
    DECLARE plan_name VARCHAR(255) DEFAULT NULL;
    DECLARE notification_message VARCHAR(500) DEFAULT NULL;
    
    -- Check if subscription was extended (end_date increased and status is approved)
    -- This detects when user extends their existing subscription
    IF NEW.end_date IS NOT NULL 
       AND OLD.end_date IS NOT NULL
       AND NEW.end_date > OLD.end_date 
       AND NEW.status_id = 2 
       AND OLD.status_id = 2 THEN
        
        -- Get plan name
        SELECT plan_name INTO plan_name 
        FROM member_subscription_plan 
        WHERE id = NEW.plan_id
        LIMIT 1;
        
        -- Create extension notification if we have plan name
        IF plan_name IS NOT NULL THEN
            INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
            VALUES (
                NEW.user_id, 
                CONCAT('Your ', plan_name, ' has been extended! It is now active until ', DATE_FORMAT(NEW.end_date, '%M %d, %Y')),
                1, 
                3, 
                NOW()
            );
        END IF;
    -- Check if subscription was approved (status changed from non-approved to approved)
    -- This is for new subscriptions, not extensions
    ELSEIF OLD.status_id != 2 AND NEW.status_id = 2 AND NEW.end_date IS NOT NULL THEN
        -- Get plan name
        SELECT plan_name INTO plan_name 
        FROM member_subscription_plan 
        WHERE id = NEW.plan_id
        LIMIT 1;
        
        -- Create new subscription notification if we have plan name
        IF plan_name IS NOT NULL THEN
            INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
            VALUES (
                NEW.user_id, 
                CONCAT('Payment successful! Your ', plan_name, ' is active until ', DATE_FORMAT(NEW.end_date, '%M %d, %Y')),
                1, 
                3, 
                NOW()
            );
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_subscription_renewed` AFTER INSERT ON `subscription` FOR EACH ROW BEGIN
    DECLARE plan_name VARCHAR(255) DEFAULT NULL;
    
    -- Directly check if status_id = 2 (approved) - this is more reliable
    IF NEW.status_id = 2 AND NEW.end_date IS NOT NULL THEN
        -- Get plan name
        SELECT plan_name INTO plan_name 
        FROM member_subscription_plan 
        WHERE id = NEW.plan_id
        LIMIT 1;
        
        -- Create notification if we have plan name
        IF plan_name IS NOT NULL THEN
            INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
            VALUES (
                NEW.user_id, 
                CONCAT('Payment successful! Your ', plan_name, ' is active until ', DATE_FORMAT(NEW.end_date, '%M %d, %Y')),
                1, 
                3, 
                NOW()
            );
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `subscription_feature`
--

CREATE TABLE `subscription_feature` (
  `id` int(11) NOT NULL,
  `plan_id` int(11) DEFAULT NULL,
  `feature_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `subscription_feature`
--

INSERT INTO `subscription_feature` (`id`, `plan_id`, `feature_name`, `description`) VALUES
(66, 1, 'Discounted Monthly Plans', 'Get lower prices on your monthly subscriptions with an active membership'),
(67, 1, 'Full App Access', 'Get full access to the gym app with no restrictions — enjoy the premium version and all its features.'),
(68, 1, 'App & Discounts Only', 'Membership includes full app access and exclusive discounts — gym facility access is not included'),
(69, 2, '1-Month Gym Access', 'Access all gym equipment and facilities for a full month and enjoy complete freedom to train at your own pace'),
(70, 2, 'Membership Exclusive Subscription', 'Available only for members and offered at a lower price than the standard monthly pass.'),
(71, 3, '1-Month Gym Access', 'Full access to all gym equipment and facilities for one month. Available to anyone at the standard price.'),
(72, 3, 'Standard Access', 'Some app features are restricted.'),
(98, 6, 'One Session Only', 'Valid for a single workout session on the same day.'),
(99, 6, 'Full Gym Access', 'Use all available gym equipment and facilities during your visit.'),
(100, 6, 'Ideal for Visitors', 'Great for travelers or guests who want a quick workout.');

-- --------------------------------------------------------

--
-- Table structure for table `subscription_status`
--

CREATE TABLE `subscription_status` (
  `id` int(11) NOT NULL,
  `status_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `subscription_status`
--

INSERT INTO `subscription_status` (`id`, `status_name`) VALUES
(1, 'pending_approval'),
(2, 'approved'),
(3, 'rejected'),
(4, 'cancelled'),
(5, 'expired'),
(6, 'pending_payment');

-- --------------------------------------------------------

--
-- Table structure for table `support_requests`
--

CREATE TABLE `support_requests` (
  `id` int(11) NOT NULL,
  `ticket_number` varchar(20) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_email` varchar(255) NOT NULL,
  `subject` varchar(500) NOT NULL,
  `message` text NOT NULL,
  `status` enum('pending','in_progress','resolved') DEFAULT 'pending',
  `source` varchar(100) NOT NULL DEFAULT 'mobile_app',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `support_requests`
--

INSERT INTO `support_requests` (`id`, `ticket_number`, `user_id`, `user_email`, `subject`, `message`, `status`, `source`, `created_at`, `updated_at`) VALUES
(1, 'REQ-00001', 11, 'uyguangco.francisbaron@gmail.com', 'broken equipment', 'guba ang equipment kdkdjfjf', 'resolved', 'mobile_app', '2025-11-26 05:41:26', '2026-01-30 06:39:28'),
(2, 'REQ-00002', 11, 'uyguangco.francisbaron@gmail.com', 'negro', 'negroasdasd', 'resolved', 'mobile_app', '2026-01-25 10:00:45', '2026-01-30 06:39:46'),
(3, 'REQ-00003', 32, 'rjtann@gmail.com', 'broken machine', 'machine flies', 'resolved', 'mobile_app', '2026-01-28 03:16:52', '2026-01-30 06:39:55'),
(4, 'REQ-00004', 34, 'Skirt@gmail.com', 'Broken Machine', 'na bali ag wire', 'resolved', 'mobile_app', '2026-01-30 06:27:11', '2026-01-30 06:28:33'),
(5, 'REQ-00005', 34, 'Skirt@gmail.com', 'Guba ag cr', 'dima flash akoa tae', 'resolved', 'mobile_app', '2026-01-30 06:40:32', '2026-01-30 06:46:10'),
(6, 'REQ-00006', 34, 'Skirt@gmail.com', 'tabangi ko bi', 'spot sir spootty', 'resolved', 'mobile_app', '2026-01-30 07:23:03', '2026-01-30 07:23:27');

--
-- Triggers `support_requests`
--
DELIMITER $$
CREATE TRIGGER `notify_admin_new_support_request` AFTER INSERT ON `support_requests` FOR EACH ROW BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE admin_id INT;
    DECLARE admin_cursor CURSOR FOR 
        SELECT id FROM user WHERE user_type_id = 1; -- Admin user type
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN admin_cursor;
    
    read_loop: LOOP
        FETCH admin_cursor INTO admin_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            admin_id,
            CONCAT('? New support request: ', NEW.subject),
            1, -- Unread
            8, -- Info type
            NOW()
        );
    END LOOP;
    
    CLOSE admin_cursor;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_support_new_request` AFTER INSERT ON `support_requests` FOR EACH ROW BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE admin_id INT;
    DECLARE admin_cursor CURSOR FOR 
        SELECT id FROM user WHERE user_type_id = 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN admin_cursor;
    
    read_loop: LOOP
        FETCH admin_cursor INTO admin_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            admin_id,
            CONCAT('New support request: ', NEW.subject),
            1, -- Unread
            8, -- Info type
            NOW()
        );
    END LOOP;
    
    CLOSE admin_cursor;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_support_status_change` AFTER UPDATE ON `support_requests` FOR EACH ROW BEGIN
    -- Only notify if status changed and user_id exists
    IF OLD.status != NEW.status AND NEW.user_id IS NOT NULL THEN
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.user_id,
            CASE 
                WHEN NEW.status = 'in_progress' THEN CONCAT('Your support request is being processed.')
                WHEN NEW.status = 'resolved' THEN CONCAT('Your support request has been resolved.')
                ELSE CONCAT('Your support request status has been updated.')
            END,
            1, -- Unread
            8, -- Info type
            NOW()
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `support_request_messages`
--

CREATE TABLE `support_request_messages` (
  `id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL COMMENT 'Reference to support_requests.id',
  `sender_id` int(11) NOT NULL COMMENT 'User who sent the message',
  `message` text NOT NULL COMMENT 'Message content',
  `created_at` datetime DEFAULT current_timestamp() COMMENT 'When message was sent'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Messages for support requests';

--
-- Dumping data for table `support_request_messages`
--

INSERT INTO `support_request_messages` (`id`, `request_id`, `sender_id`, `message`, `created_at`) VALUES
(42, 1, 15, 'kuya geo baho kaayo ang cr si kent gildo ang last ato pls paki check kay dako kay tubol di ma flush!!:(\n🫠😞', '2025-11-25 18:52:11'),
(43, 1, 2, 'e pahawa nato na! yati ra!', '2025-11-25 18:53:13'),
(44, 1, 15, 'salamat kuya geo dugay rako nag dumot ana kay taga workout niya ag panimaho ang tae og ilok di man lang manawas', '2025-11-25 18:53:41'),
(45, 1, 2, 'expired na baya na!', '2025-11-25 18:53:57'),
(46, 1, 15, 'mao man bantog ra agpamilin sa dako na tubol', '2025-11-25 18:54:14'),
(47, 1, 2, 'warning animal!', '2025-11-25 18:54:34'),
(48, 1, 15, 'hhuu', '2025-11-25 18:57:53'),
(49, 1, 15, 'hello', '2025-11-25 18:58:10'),
(50, 2, 15, 'kuya geo naunsa naman ni ang ilisanan nabuak man ang samin feeling nako ang last ani kato man sigurong kuloton naay alom sa aping pacheck daw kuya geo', '2025-11-25 19:10:01'),
(51, 2, 2, 'diko', '2025-11-25 19:18:22'),
(52, 2, 2, 'sure diha', '2025-11-25 19:18:40'),
(53, 1, 11, 'guba ang equipment kdkdjfjf', '2025-11-26 05:41:26'),
(54, 1, 1, 'onsa nga machine mani', '2025-11-26 05:42:09'),
(55, 1, 2, 'yoww', '2025-11-26 05:42:52'),
(56, 2, 11, 'negroasdasd', '2026-01-25 10:00:45'),
(57, 3, 32, 'machine flies', '2026-01-28 03:16:52'),
(58, 3, 1, 'ok', '2026-01-28 03:17:13'),
(59, 4, 34, 'na bali ag wire', '2026-01-30 06:27:11'),
(60, 4, 1, 'aha dapita sir', '2026-01-30 06:27:35'),
(61, 4, 34, 'katong machine fly sir', '2026-01-30 06:27:44'),
(62, 4, 1, 'okay asikasohon namo na todya sir', '2026-01-30 06:27:59'),
(63, 2, 1, 'pak u', '2026-01-30 06:39:41'),
(64, 5, 34, 'dima flash akoa tae', '2026-01-30 06:40:32'),
(65, 5, 1, 'pag sure dha oy', '2026-01-30 06:41:15'),
(66, 5, 1, 'ok dong tinood jud diay aing gi taguan', '2026-01-30 06:46:05'),
(67, 6, 34, 'spot sir spootty', '2026-01-30 07:23:03'),
(68, 6, 1, 'spot binaong man ka ah', '2026-01-30 07:23:14');

--
-- Triggers `support_request_messages`
--
DELIMITER $$
CREATE TRIGGER `notify_support_new_message` AFTER INSERT ON `support_request_messages` FOR EACH ROW BEGIN
    DECLARE request_user_id INT;
    DECLARE sender_user_type INT;
    
    -- Get request user_id
    SELECT user_id INTO request_user_id FROM support_requests WHERE id = NEW.request_id;
    
    -- Get sender user type
    SELECT user_type_id INTO sender_user_type FROM user WHERE id = NEW.sender_id;
    
    -- Notify user if message is from admin/staff (user_type_id 1 or 2)
    IF request_user_id IS NOT NULL AND sender_user_type IN (1, 2) THEN
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            request_user_id,
            CONCAT('? New reply on your support request: ', LEFT(NEW.message, 50), '...'),
            1, -- Unread
            8, -- Info type
            NOW()
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `target_muscle`
--

CREATE TABLE `target_muscle` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `image_url` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `target_muscle`
--

INSERT INTO `target_muscle` (`id`, `name`, `image_url`, `parent_id`) VALUES
(13, 'Chest', 'http://localhost/cynergy/image-servers.php?image=68e4bdc995d2a_1759821257.jpg', NULL),
(14, 'Back', 'http://localhost/cynergy/image-servers.php?image=68e3601c90c68_1759731740.jpg', NULL),
(15, 'Shoulder', 'http://localhost/cynergy/image-servers.php?image=68e35ff3c80bf_1759731699.jpg', NULL),
(29, 'Core', 'http://localhost/cynergy/image-servers.php?image=68e4bdbf3044e_1759821247.jpg', NULL),
(70, 'Upper Chest', 'http://localhost/cynergy/image-servers.php?image=68f64dd7e8266_1760972247.jpg', 13),
(71, 'Middle Chest', 'http://localhost/cynergy/image-servers.php?image=68f64de00c60e_1760972256.jpg', 13),
(72, 'Lower Chest', 'http://localhost/cynergy/image-servers.php?image=68f64dcc3d660_1760972236.jpg', 13),
(73, 'Upper Back', 'https://api.cnergy.site/image-servers.php?image=6925e143daf07_1764090179.jpeg', 14),
(74, 'Mid Back', '', 14),
(75, 'Lower Back', '', 14),
(76, 'Lats', 'http://localhost/cynergy/image-servers.php?image=68f64d9478f41_1760972180.jpg', 14),
(77, 'Front Shoulders', '', 15),
(78, 'Side Shoulders', 'https://api.cnergy.site/image-servers.php?image=6925e136250f1_1764090166.jpeg', 15),
(79, 'Rear Shoulders', '', 15),
(80, 'Arms', 'http://localhost/cynergy/image-servers.php?image=68e4bdaac1683_1759821226.jpg', NULL),
(81, 'Legs', 'http://localhost/cynergy/image-servers.php?image=68e4bdb72737e_1759821239.jpg', NULL),
(82, 'Biceps', 'http://localhost/cynergy/image-servers.php?image=68e35fc7a61a1_1759731655.jpg', 80),
(83, 'Triceps', 'http://localhost/cynergy/image-servers.php?image=68f64ea977586_1760972457.jpg', 80),
(84, 'Forearms', 'http://localhost/cynergy/image-servers.php?image=68f64eb18b226_1760972465.jpg', 80),
(85, 'Quads', 'http://localhost/cynergy/image-servers.php?image=68f64dad93d06_1760972205.jpg', 81),
(86, 'Hamstring', 'http://localhost/cynergy/image-servers.php?image=68f64db61bead_1760972214.jpg', 81),
(87, 'Glutes', '', 81),
(88, 'Calves', 'http://localhost/cynergy/image-servers.php?image=68f64d9e5c757_1760972190.jpg', 81),
(89, 'Brachialis', 'https://api.cnergy.site/image-servers.php?image=6925e1244daf1_1764090148.jpeg', 80),
(90, 'Abs', '', 29),
(91, 'Obliques', 'http://localhost/cynergy/image-servers.php?image=68f64e10591ac_1760972304.jpg', 29);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `user_type_id` int(11) DEFAULT NULL,
  `gender_id` int(11) DEFAULT NULL,
  `failed_attempt` int(11) DEFAULT 0,
  `last_attempt` datetime DEFAULT NULL,
  `fname` varchar(255) NOT NULL,
  `mname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `bday` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `registration_date` datetime DEFAULT NULL,
  `verification_deadline` datetime DEFAULT NULL,
  `account_status` enum('pending','approved','rejected','deactivated') DEFAULT 'pending',
  `deactivation_reason` text DEFAULT NULL COMMENT 'Reason for account deactivation',
  `is_deleted` tinyint(1) DEFAULT 0,
  `profile_photo_url` varchar(500) DEFAULT NULL,
  `parent_consent_file_url` varchar(500) DEFAULT NULL COMMENT 'File path to parent consent letter/waiver for users under 18 years old',
  `system_photo_url` varchar(500) DEFAULT NULL COMMENT 'File path to system photo for face tracking and identification (separate from mobile app profile photo)'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `email`, `password`, `user_type_id`, `gender_id`, `failed_attempt`, `last_attempt`, `fname`, `mname`, `lname`, `bday`, `created_at`, `registration_date`, `verification_deadline`, `account_status`, `deactivation_reason`, `is_deleted`, `profile_photo_url`, `parent_consent_file_url`, `system_photo_url`) VALUES
(1, 'georielijamesbulaybulay@gmail.com', '$2y$10$eMPbf3M726FOluqdqPISpu9pl8l5FDzfPJ.Xr.YqQerkApKlzWDE6', 1, 1, 0, NULL, 'Geo', 'georielijamesbulaybulay@gmail.com', 'James', '1997-09-09', '2025-11-26 01:24:59', NULL, NULL, 'approved', NULL, 0, 'uploads/profile/profile_1_1769763196_697c717cd58e5.png', NULL, NULL),
(2, 'christiannoynay000@gmail.com', '$2y$10$xuCAwDoDgSzoWHrXfrC1k.hRSjnkTGT6QVlbBEUdR2UOGboj1HXWG', 2, 1, 0, '2026-01-30 08:53:36', 'Christian', 'Sacoso', 'Noynay', '2001-12-23', '2025-11-26 02:55:11', NULL, NULL, 'pending', NULL, 0, NULL, NULL, NULL),
(3, 'kent@gmail.com', '$2y$10$QXMNicFyubYNwYcvTujPA.8MFjc./lm4DCZAFbm78frdD/l3i2QFu', 3, 1, 6, '2026-01-31 05:27:53', 'Kent Wilson', '', 'Gildo', '2002-08-29', '2025-11-26 02:56:25', NULL, NULL, 'approved', NULL, 0, 'uploads/avatars/avatar_3_6926742376527.jpg', NULL, NULL),
(4, 'joanne@gmail.com', '$2y$10$RTDR.x9dCN/QUH9aLNd9i.V/4aO/vvCBPwZhSmQefFRh3RMPkz9Wy', 4, NULL, 0, NULL, 'Joanne', 'Rebuta', 'Sagiahon', '2001-06-24', '2025-11-26 03:01:08', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(5, 'chsa.noynay.coc@phinmaed.com', '$2y$10$05ZN7PzfBwN2ASkUM8LxQejsISfo16GlcOa4MRnZiN8Q82UluAdNa', 4, 2, 0, NULL, 'Raziel', '', 'Jabulan', '2005-11-29', '2025-11-26 03:12:58', '2025-11-26 03:12:58', '2025-11-29 03:12:58', 'approved', NULL, 0, 'uploads/avatars/avatar_5_692671003b868.jpg', NULL, NULL),
(6, 'rjaylouise@gmail.com', '$2y$10$SzxlBuO2lxLnOMqFLs0oVuiEp4sUG007C8VNwNKHe9QJx5nDEJElK', 3, 1, 0, NULL, 'Rj louise', '', 'Tan', '2003-08-05', '2025-11-26 03:23:48', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(7, 'christiannoynay5@gmail.com', '$2y$10$/f/YQQ6jCMXjYD7syRL2SOpOypMtjPXZ/AQAPWjRXwFntKALaACeC', 4, 1, 0, NULL, 'Cjay', 'cabusog', 'Gallegos', '2005-11-23', '2025-11-26 03:31:58', '2025-11-26 03:31:58', '2025-11-29 03:31:58', 'approved', NULL, 0, NULL, NULL, NULL),
(8, 'versozamae@gmail.com', '$2y$10$jibzFYSTiYUeZI5.59Z3telKXmPl2dorG5A.e4l64XGvNhCDgIjSu', 4, NULL, 0, NULL, 'Mae', '', 'versoza', '2005-01-12', '2025-11-26 03:38:53', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(9, 'gildojerry@gmail.com', '$2y$10$qEYRcsf9onyWZ7lIVvhcv.T51/56jRxOIqZpfM1Vsz6QvBxh9UO7C', 4, 2, 0, NULL, 'Jerry', 'Sacoso', 'Gildo', '2006-11-12', '2025-11-26 03:53:39', '2025-11-26 03:53:39', '2025-11-29 03:53:39', 'approved', NULL, 0, NULL, NULL, NULL),
(10, 'francisgildo@gmail.com', '$2y$10$WS8NTH5NNfIPGLjhyX4s6.KlHUSLjwqSAVa7TG8uKFryBeW.6Ns/6', 4, NULL, 0, NULL, 'francis', '', 'gildo', '2010-06-20', '2025-11-26 05:11:05', NULL, NULL, 'approved', NULL, 0, NULL, 'uploads/consents/consent_1764133865_69268be91d830.jpeg', NULL),
(11, 'uyguangco.francisbaron@gmail.com', '$2y$10$13ruSpPfsSBjGVC7y68xDOsYDhwo2eQW/TXN.L.LyYjVtouA39DY.', 4, 1, 0, NULL, 'Francis Baron', 'Bongado', 'Uyguangco', '2002-08-29', '2025-11-26 05:18:45', '2025-11-26 05:18:45', '2025-11-29 05:18:45', 'approved', NULL, 0, 'uploads/avatars/avatar_11_697d926a96fff.jpg', NULL, NULL),
(12, 'lemy@gmail.com', '$2y$10$uJb2PU0wZ1DiYvJGThldruBFY4auRAZ3Fpifg2fmvhxfw74/9NBjO', 4, NULL, 0, NULL, 'Jason', '', 'Lemuel', '2001-11-04', '2025-11-29 14:18:25', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(13, 'honeylim@gmail.com', '$2y$10$ot2wJXzbF5yNbXPsAohEE.5o7seBWlfN9XQm3d8UkeDxiqJ8xgIfW', 4, NULL, 0, NULL, 'Honey', '', 'Lim', '2012-11-06', '2025-11-29 14:21:50', NULL, NULL, 'approved', NULL, 0, NULL, 'uploads/consents/consent_1764426110_692b017e618b2.jpg', NULL),
(14, 'cy@gmail.com', '$2y$10$PFV2ZUUoOSzog1ilkNPuc.2oLxQhYKD70fNkNlM9dOICk3yS.GABa', 4, NULL, 0, NULL, 'Edward', '', 'Cy', '2003-06-01', '2025-11-29 15:05:30', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(15, 'dave@gmail.com', '$2y$10$Ylh4nNi4lJfpc7oCIb77lO49Si4Yomgqt3WEMuOvxnySP8ElxCzYW', 4, NULL, 0, NULL, 'Harley', '', 'Dave', '2007-02-13', '2026-01-22 17:57:18', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(16, 'junie@gmail.com', '$2y$10$WHfkKXxx7F8XEoz6belffeaKeV7IWIaiFyaAgbp7pRgAgsqcpd9lW', 4, NULL, 0, NULL, 'JunJun', '', 'Juniebvoy', '2003-05-05', '2026-01-22 18:19:00', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(17, 'blooda@gmail.com', '$2y$10$ptpl02n16w5n5rem7glrlOxWiLkR37Qsqq5oUyPY9Ovaocip5/vxC', 4, NULL, 0, NULL, 'young', '', 'bloood', '2003-04-04', '2026-01-22 18:25:36', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(18, 'henrycy@gmail.com', '$2y$10$WbeEHWogoAYDcCGkaQaHNOsmpgRgLCH/CyCCRu5u6anW/sh8eP6Mu', 4, NULL, 0, NULL, 'King', '', 'Henry', '2003-03-04', '2026-01-22 18:39:28', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(19, 'jim@gmail.com', '$2y$10$M026yMMzc7woOFy8DVzShOV3SaaMJkksXFXFAe6uC3iKQYI7Qy4pC', 4, NULL, 0, NULL, 'Jmmy', '', 'Jim', '2004-06-20', '2026-01-22 18:44:27', NULL, NULL, 'approved', NULL, 0, NULL, NULL, 'uploads/system_photos/system_1769108507_6972741b4391d.jpg'),
(20, 'hbhg@gmail.com', '$2y$10$mWH/epohySny3676lGrbbuHPsionQrffiSZ7VTBfuOD2DWBZ90XZm', 4, NULL, 0, NULL, 'jhuh', '', 'hbg', '2003-04-04', '2026-01-22 19:08:37', NULL, NULL, 'approved', NULL, 0, NULL, NULL, 'uploads/system_photos/system_1769108917_697275b5c3829.png'),
(21, 'rjtan@gmail.com', '$2y$10$i4V9FwVuaVEJdg5HPOnsKOgU1BySVttakfbKgyuLjGUQl07CSheBa', 4, 1, 0, NULL, 'Rjay', 'Louise', 'Tan', '2003-01-28', '2026-01-25 09:24:58', '2026-01-25 09:24:58', '2026-01-28 09:24:58', 'approved', NULL, 0, NULL, NULL, 'uploads/system_photos/system_1769338431_6975f63f49c26.jpg'),
(22, 'lou@gmail.con', '$2y$10$Xr1MPbgEWGxoxorRbCIflOqD5D4QYlvuwhNOb0jrwrdwOEzDFm0jS', 4, 1, 0, NULL, 'Jay', '', 'Lou', '2003-01-28', '2026-01-25 09:43:47', '2026-01-25 09:43:47', '2026-01-28 09:43:47', 'approved', NULL, 0, NULL, NULL, 'uploads/system_photos/system_1769334253_6975e5ed57edb.jpg'),
(23, 'goli@gmail.com', '$2y$10$huK/9lz0LXFkRz8.VDyFa.5A0Peb9CD6TSV4wCP2OZudoMmG5u1mq', 4, NULL, 0, NULL, 'David', '', 'GoliGOli', '2000-04-04', '2026-01-26 05:47:12', NULL, NULL, 'approved', NULL, 0, NULL, NULL, 'uploads/system_photos/system_1769406432_6976ffe084f46.png'),
(24, 'd@gmail.com', '$2y$10$y6k6P4Gv45QaL6b/EXdf6.KP3NMrHtcaV.OCgGlqVLu6093X4e0Y6', 4, NULL, 0, NULL, 'Harley', '', 'Davidson', '2000-02-01', '2026-01-26 06:12:55', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(25, 'li@gmail.com', '$2y$10$CRkLENaCuPFun9fNfzs7kegBHY0g6iF54tzS7zaKYC5gxMv3JJ3fS', 4, NULL, 0, NULL, 'Lim', '', 'li', '2000-01-22', '2026-01-26 06:20:05', NULL, NULL, 'approved', NULL, 0, NULL, NULL, 'uploads/system_photos/system_1769408405_69770795a0045.png'),
(26, 'zom@gmail.com', '$2y$10$xykp2ZjSoD1ZqZSOeNiILe4cyEN/Bn0U16nr2BnRbIlhoqd6SKg3q', 4, NULL, 0, NULL, 'ZOm', '', 'zom', '2000-03-02', '2026-01-26 06:31:14', NULL, NULL, 'approved', NULL, 0, NULL, NULL, 'uploads/system_photos/system_1769409074_69770a32213c5.png'),
(27, 'lamio@gmail.com', '$2y$10$UYGRn0r.ocUKKc5o966sNu79qctXsxoETE0jAmatKjKgsbTtB8q0O', 4, NULL, 0, NULL, 'LAm', '', 'la', '2003-08-05', '2026-01-26 06:41:15', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(28, 'james@gmail.com', '$2y$10$//lIozNOSDmUZ27dK42feu7HTF1T/YIgbquJ00Ykoug3jJ4UZLUh6', 4, NULL, 0, NULL, 'James', '', 'Lemmy', '2003-06-06', '2026-01-26 17:30:34', NULL, NULL, 'approved', NULL, 0, NULL, NULL, 'uploads/system_photos/system_1769448634_6977a4ba3884b.jpg'),
(29, 'dom@gmail.com', '$2y$10$9smXeCKj9qzsN0j67qlAr.zE5b3n3bEls15uaPuGyX4r1nmBCb22q', 4, NULL, 0, NULL, 'Domm', '', 'Dom', '2000-02-02', '2026-01-26 17:40:45', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(30, 'le@gmail.com', '$2y$10$/FQL6xLWxA/LWwzhbFIoOOQMO8NwefSvUffXYE5oI3TnbxiCRDD8W', 4, NULL, 0, NULL, 'le', '', 'le', '2000-02-02', '2026-01-26 17:48:09', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(31, 'jane@gmail.com', '$2y$10$kOapXiOV8mG10OGVBKpCTeqE0h8HsX5.JdFsi4ohIJ7yub2In4QQa', 4, NULL, 0, NULL, 'Crister', '', 'Jane', '2002-03-30', '2026-01-26 17:50:40', NULL, NULL, 'approved', NULL, 0, NULL, NULL, 'uploads/system_photos/system_1769449840_6977a97099eed.png'),
(32, 'rjtann@gmail.com', '$2y$10$bigLd7oQdqfdo7/rmSpo..awFfgpLTEM7fcu6oHinYW/U3G2xPKza', 4, 1, 0, NULL, 'Rjayy', '', 'Tan', '2002-01-31', '2026-01-28 02:50:06', '2026-01-28 02:50:06', '2026-01-31 02:50:06', 'approved', NULL, 0, NULL, NULL, NULL),
(33, 'wan@gmail.com', '$2y$10$S1tVgYNw6SQp9yelU2rAn./rPkVwojpxKmurNSw5pUEJ8SoHMO5.K', 4, NULL, 0, NULL, 'Won', '', 'Wan', '2000-02-02', '2026-01-30 05:52:07', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(34, 'Skirt@gmail.com', '$2y$10$n.XEpKXWEv.HkGiE64DS/OXTpcR0TZGSYocD0sD4nfFDr051g4mm.', 4, 1, 0, NULL, 'Limey', 'Skirt', 'Skirt', '2003-02-10', '2026-01-30 06:25:08', '2026-01-30 06:25:08', '2026-02-02 06:25:08', 'approved', NULL, 0, NULL, NULL, NULL),
(35, 'lavvy@gmail.com', '$2y$10$Y5ao9BCwIVbxKn1Nmq7ZLeHhXzFBSuWHSInCVozYMUmvu/ROdu3q2', 4, NULL, 0, NULL, 'Rendon', '', 'Lavrador', '2000-02-02', '2026-01-30 07:26:01', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL),
(36, 'taddy@gmail.com', '$2y$10$PIsMoBBClTpMaYqDmeIW6ORc9oa89wD8srIFHa5Fn6crq4DgHGLcG', 4, NULL, 0, NULL, 'LAbitad', '', 'tadtad', '2000-02-20', '2026-01-30 08:14:19', NULL, NULL, 'approved', NULL, 0, NULL, NULL, NULL);

--
-- Triggers `user`
--
DELIMITER $$
CREATE TRIGGER `log_account_deactivation` AFTER UPDATE ON `user` FOR EACH ROW BEGIN
    -- Check if status changed to deactivated
    IF OLD.account_status != 'deactivated' AND NEW.account_status = 'deactivated' THEN
        -- Send notification to the deactivated user
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        VALUES (
            NEW.id, 
            'Your account has been deactivated. Please contact gym administration for more information.',
            1, -- Unread
            2, -- Warning
            NOW()
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `notify_member_registration` AFTER INSERT ON `user` FOR EACH ROW BEGIN
    IF NEW.user_type_id = 4 THEN
        INSERT INTO `notification` (`user_id`, `message`, `status_id`, `type_id`, `timestamp`)
        SELECT 
            u.id,
            CONCAT('New member registered: ', NEW.fname, ' ', NEW.lname, ' (', NEW.email, ')'),
            1, 
            1, 
            NOW()
        FROM `user` u 
        WHERE u.user_type_id = 1; 
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `usertype`
--

CREATE TABLE `usertype` (
  `id` int(11) NOT NULL,
  `type_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `usertype`
--

INSERT INTO `usertype` (`id`, `type_name`) VALUES
(1, 'admin'),
(2, 'staff'),
(3, 'coach'),
(4, 'customer');

-- --------------------------------------------------------

--
-- Table structure for table `user_discount_eligibility`
--

CREATE TABLE `user_discount_eligibility` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `discount_type` enum('student','senior') NOT NULL,
  `verified_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime DEFAULT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `user_discount_eligibility`
--

INSERT INTO `user_discount_eligibility` (`id`, `user_id`, `discount_type`, `verified_at`, `expires_at`, `verified_by`, `is_active`, `notes`, `created_at`) VALUES
(1, 4, 'student', '2025-11-26 03:01:11', '2026-11-26 03:01:11', 1, 1, 'Applied during account creation with subscription', '2025-11-26 03:01:11'),
(2, 7, 'student', '2025-11-26 03:33:28', '2026-11-26 03:33:28', 2, 1, 'Applied during account creation with subscription', '2025-11-26 03:33:28'),
(3, 8, 'senior', '2025-11-26 03:38:53', NULL, 2, 1, 'Applied during account creation with subscription', '2025-11-26 03:38:53'),
(4, 9, 'student', '2025-11-26 03:59:58', '2026-11-26 03:59:58', 2, 1, 'Applied during account creation with subscription', '2025-11-26 03:59:58'),
(5, 10, 'student', '2025-11-26 05:11:05', '2026-11-26 05:11:05', 2, 1, 'Applied during account creation with subscription', '2025-11-26 05:11:05'),
(6, 11, 'student', '2025-11-26 05:30:09', '2026-11-26 05:30:09', 1, 1, 'Applied during account approval with subscription', '2025-11-26 05:30:09'),
(7, 32, 'student', '2026-01-28 02:54:15', '2027-01-28 02:54:15', 1, 1, 'Applied during account approval with subscription', '2026-01-28 02:54:15');

-- --------------------------------------------------------

--
-- Table structure for table `user_training_preferences`
--

CREATE TABLE `user_training_preferences` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `training_focus` varchar(50) NOT NULL DEFAULT 'full_body',
  `custom_muscle_groups` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_muscle_groups`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_warning_dismissals`
--

CREATE TABLE `user_warning_dismissals` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `muscle_group_id` int(11) NOT NULL,
  `warning_type` varchar(50) NOT NULL DEFAULT 'neglected',
  `first_dismissed_at` timestamp NULL DEFAULT current_timestamp(),
  `last_seen_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `dismiss_count` int(11) DEFAULT 1,
  `is_permanent` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workout_session_log`
--

CREATE TABLE `workout_session_log` (
  `id` int(11) NOT NULL,
  `member_program_hdr_id` int(11) DEFAULT NULL,
  `session_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `completed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `account_deactivation_log`
--
ALTER TABLE `account_deactivation_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `deactivated_by` (`deactivated_by`);

--
-- Indexes for table `achievements`
--
ALTER TABLE `achievements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `admin_activity_log`
--
ALTER TABLE `admin_activity_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin_id` (`admin_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `announcement`
--
ALTER TABLE `announcement`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_attendance_guest` (`guest_session_id`);

--
-- Indexes for table `attendance_denied_log`
--
ALTER TABLE `attendance_denied_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_guest_session_id` (`guest_session_id`),
  ADD KEY `idx_denial_reason` (`denial_reason`),
  ADD KEY `idx_attempted_at` (`attempted_at`);

--
-- Indexes for table `body_measurements`
--
ALTER TABLE `body_measurements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `created_at` (`created_at`);

--
-- Indexes for table `coaches`
--
ALTER TABLE `coaches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `coach_availability`
--
ALTER TABLE `coach_availability`
  ADD PRIMARY KEY (`id`),
  ADD KEY `coach_id` (`coach_id`);

--
-- Indexes for table `coach_member_list`
--
ALTER TABLE `coach_member_list`
  ADD PRIMARY KEY (`id`),
  ADD KEY `coach_id` (`coach_id`),
  ADD KEY `member_id` (`member_id`),
  ADD KEY `handled_by_coach` (`handled_by_coach`),
  ADD KEY `handled_by_staff` (`handled_by_staff`);

--
-- Indexes for table `coach_review`
--
ALTER TABLE `coach_review`
  ADD PRIMARY KEY (`id`),
  ADD KEY `coach_id` (`coach_id`),
  ADD KEY `member_id` (`member_id`);

--
-- Indexes for table `coach_sales`
--
ALTER TABLE `coach_sales`
  ADD PRIMARY KEY (`sale_id`);

--
-- Indexes for table `coach_session_usage`
--
ALTER TABLE `coach_session_usage`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_daily_usage` (`coach_member_id`,`usage_date`),
  ADD KEY `idx_coach_member_id` (`coach_member_id`),
  ADD KEY `idx_usage_date` (`usage_date`);

--
-- Indexes for table `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `participant1_id` (`participant1_id`,`participant2_id`),
  ADD KEY `participant2_id` (`participant2_id`);

--
-- Indexes for table `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires` (`expires_at`);

--
-- Indexes for table `exercise`
--
ALTER TABLE `exercise`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `exercise_target_muscle`
--
ALTER TABLE `exercise_target_muscle`
  ADD PRIMARY KEY (`id`),
  ADD KEY `exercise_id` (`exercise_id`),
  ADD KEY `muscle_id` (`muscle_id`);

--
-- Indexes for table `explore_program_workout`
--
ALTER TABLE `explore_program_workout`
  ADD PRIMARY KEY (`id`),
  ADD KEY `program_id` (`program_id`);

--
-- Indexes for table `gender`
--
ALTER TABLE `gender`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `guest_session`
--
ALTER TABLE `guest_session`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `qr_token` (`qr_token`),
  ADD KEY `idx_guest_session_payment_link_id` (`payment_link_id`),
  ADD KEY `idx_guest_session_code` (`session_code`),
  ADD KEY `idx_reference_number` (`reference_number`);

--
-- Indexes for table `membership`
--
ALTER TABLE `membership`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `member_achievements`
--
ALTER TABLE `member_achievements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `achievement_id` (`achievement_id`);

--
-- Indexes for table `member_exercise_log`
--
ALTER TABLE `member_exercise_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_id` (`member_id`),
  ADD KEY `member_workout_exercise_id` (`member_workout_exercise_id`);

--
-- Indexes for table `member_exercise_set_log`
--
ALTER TABLE `member_exercise_set_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `exercise_log_id` (`exercise_log_id`);

--
-- Indexes for table `member_fitness_goals`
--
ALTER TABLE `member_fitness_goals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `member_profile_details`
--
ALTER TABLE `member_profile_details`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `gender_id` (`gender_id`);

--
-- Indexes for table `member_programhdr`
--
ALTER TABLE `member_programhdr`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `program_hdr_id` (`program_hdr_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `member_program_schedule`
--
ALTER TABLE `member_program_schedule`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_program_day` (`member_program_hdr_id`,`day_of_week`),
  ADD KEY `idx_day_of_week` (`day_of_week`),
  ADD KEY `idx_scheduled_time` (`scheduled_time`),
  ADD KEY `workout_id` (`workout_id`);

--
-- Indexes for table `member_program_workout`
--
ALTER TABLE `member_program_workout`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_program_hdr_id` (`member_program_hdr_id`);

--
-- Indexes for table `member_subscription_plan`
--
ALTER TABLE `member_subscription_plan`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `member_workout_exercise`
--
ALTER TABLE `member_workout_exercise`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_program_workout_id` (`member_program_workout_id`),
  ADD KEY `exercise_id` (`exercise_id`);

--
-- Indexes for table `merchandise`
--
ALTER TABLE `merchandise`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `receiver_id` (`receiver_id`);

--
-- Indexes for table `my_goals`
--
ALTER TABLE `my_goals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `status_id` (`status_id`),
  ADD KEY `type_id` (`type_id`);

--
-- Indexes for table `notification_status`
--
ALTER TABLE `notification_status`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notification_type`
--
ALTER TABLE `notification_type`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires` (`expires_at`);

--
-- Indexes for table `payment`
--
ALTER TABLE `payment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subscription_id` (`subscription_id`),
  ADD KEY `idx_payment_intent_id` (`payment_intent_id`),
  ADD KEY `idx_payment_status` (`status`),
  ADD KEY `idx_coach_request_id` (`coach_request_id`);

--
-- Indexes for table `personal_records`
--
ALTER TABLE `personal_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `exercise_id` (`exercise_id`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_is_archived` (`is_archived`);

--
-- Indexes for table `programdetail`
--
ALTER TABLE `programdetail`
  ADD PRIMARY KEY (`id`),
  ADD KEY `program_hdr_id` (`program_hdr_id`);

--
-- Indexes for table `programhdr`
--
ALTER TABLE `programhdr`
  ADD PRIMARY KEY (`id`),
  ADD KEY `program_id` (`program_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `programs`
--
ALTER TABLE `programs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `program_review`
--
ALTER TABLE `program_review`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `program_hdr_id` (`program_hdr_id`);

--
-- Indexes for table `program_workout`
--
ALTER TABLE `program_workout`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_program_hdr_id` (`program_hdr_id`);

--
-- Indexes for table `program_workout_exercise`
--
ALTER TABLE `program_workout_exercise`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_program_workout_id` (`program_workout_id`),
  ADD KEY `idx_exercise_id` (`exercise_id`);

--
-- Indexes for table `progress_tracker`
--
ALTER TABLE `progress_tracker`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_exercise_name` (`exercise_name`),
  ADD KEY `idx_program_id` (`program_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `progress_tracking`
--
ALTER TABLE `progress_tracking`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `promotions`
--
ALTER TABLE `promotions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_reference_number` (`reference_number`);

--
-- Indexes for table `sales_details`
--
ALTER TABLE `sales_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sale_id` (`sale_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `subscription_id` (`subscription_id`),
  ADD KEY `fk_sales_guest` (`guest_session_id`);

--
-- Indexes for table `subscription`
--
ALTER TABLE `subscription`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `plan_id` (`plan_id`),
  ADD KEY `status_id` (`status_id`);

--
-- Indexes for table `subscription_feature`
--
ALTER TABLE `subscription_feature`
  ADD PRIMARY KEY (`id`),
  ADD KEY `plan_id` (`plan_id`);

--
-- Indexes for table `subscription_status`
--
ALTER TABLE `subscription_status`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `support_requests`
--
ALTER TABLE `support_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_email` (`user_email`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_source` (`source`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_ticket_number` (`ticket_number`);

--
-- Indexes for table `support_request_messages`
--
ALTER TABLE `support_request_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_request_id` (`request_id`),
  ADD KEY `idx_sender_id` (`sender_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `target_muscle`
--
ALTER TABLE `target_muscle`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `user_type_id` (`user_type_id`),
  ADD KEY `gender_id` (`gender_id`),
  ADD KEY `idx_account_status` (`account_status`),
  ADD KEY `idx_is_deleted` (`is_deleted`),
  ADD KEY `idx_verification_deadline` (`verification_deadline`),
  ADD KEY `idx_profile_photo_url` (`profile_photo_url`);

--
-- Indexes for table `usertype`
--
ALTER TABLE `usertype`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `user_discount_eligibility`
--
ALTER TABLE `user_discount_eligibility`
  ADD PRIMARY KEY (`id`),
  ADD KEY `verified_by` (`verified_by`),
  ADD KEY `idx_user_active` (`user_id`,`is_active`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `user_training_preferences`
--
ALTER TABLE `user_training_preferences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user` (`user_id`),
  ADD KEY `idx_user_focus` (`user_id`,`training_focus`);

--
-- Indexes for table `user_warning_dismissals`
--
ALTER TABLE `user_warning_dismissals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_muscle_warning` (`user_id`,`muscle_group_id`,`warning_type`),
  ADD KEY `idx_user_dismissals` (`user_id`),
  ADD KEY `idx_active_dismissals` (`user_id`,`is_permanent`);

--
-- Indexes for table `workout_session_log`
--
ALTER TABLE `workout_session_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_program_hdr_id` (`member_program_hdr_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `account_deactivation_log`
--
ALTER TABLE `account_deactivation_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `achievements`
--
ALTER TABLE `achievements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `activity_log`
--
ALTER TABLE `activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=189;

--
-- AUTO_INCREMENT for table `admin_activity_log`
--
ALTER TABLE `admin_activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `announcement`
--
ALTER TABLE `announcement`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=108;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `attendance_denied_log`
--
ALTER TABLE `attendance_denied_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `body_measurements`
--
ALTER TABLE `body_measurements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT for table `coaches`
--
ALTER TABLE `coaches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `coach_availability`
--
ALTER TABLE `coach_availability`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `coach_member_list`
--
ALTER TABLE `coach_member_list`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `coach_review`
--
ALTER TABLE `coach_review`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `coach_sales`
--
ALTER TABLE `coach_sales`
  MODIFY `sale_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `coach_session_usage`
--
ALTER TABLE `coach_session_usage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `exercise`
--
ALTER TABLE `exercise`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=74;

--
-- AUTO_INCREMENT for table `exercise_target_muscle`
--
ALTER TABLE `exercise_target_muscle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1201;

--
-- AUTO_INCREMENT for table `explore_program_workout`
--
ALTER TABLE `explore_program_workout`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=93;

--
-- AUTO_INCREMENT for table `gender`
--
ALTER TABLE `gender`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `guest_session`
--
ALTER TABLE `guest_session`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `membership`
--
ALTER TABLE `membership`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `member_achievements`
--
ALTER TABLE `member_achievements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT for table `member_exercise_log`
--
ALTER TABLE `member_exercise_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `member_exercise_set_log`
--
ALTER TABLE `member_exercise_set_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96;

--
-- AUTO_INCREMENT for table `member_fitness_goals`
--
ALTER TABLE `member_fitness_goals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=174;

--
-- AUTO_INCREMENT for table `member_profile_details`
--
ALTER TABLE `member_profile_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96;

--
-- AUTO_INCREMENT for table `member_programhdr`
--
ALTER TABLE `member_programhdr`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `member_program_schedule`
--
ALTER TABLE `member_program_schedule`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=546;

--
-- AUTO_INCREMENT for table `member_program_workout`
--
ALTER TABLE `member_program_workout`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `member_subscription_plan`
--
ALTER TABLE `member_subscription_plan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `member_workout_exercise`
--
ALTER TABLE `member_workout_exercise`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `merchandise`
--
ALTER TABLE `merchandise`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT for table `my_goals`
--
ALTER TABLE `my_goals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1015;

--
-- AUTO_INCREMENT for table `notification_status`
--
ALTER TABLE `notification_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=157;

--
-- AUTO_INCREMENT for table `notification_type`
--
ALTER TABLE `notification_type`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=316;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment`
--
ALTER TABLE `payment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `personal_records`
--
ALTER TABLE `personal_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `programdetail`
--
ALTER TABLE `programdetail`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `programhdr`
--
ALTER TABLE `programhdr`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `programs`
--
ALTER TABLE `programs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `program_review`
--
ALTER TABLE `program_review`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `program_workout`
--
ALTER TABLE `program_workout`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `program_workout_exercise`
--
ALTER TABLE `program_workout_exercise`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=97;

--
-- AUTO_INCREMENT for table `progress_tracker`
--
ALTER TABLE `progress_tracker`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `progress_tracking`
--
ALTER TABLE `progress_tracking`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `promotions`
--
ALTER TABLE `promotions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=75;

--
-- AUTO_INCREMENT for table `sales_details`
--
ALTER TABLE `sales_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=74;

--
-- AUTO_INCREMENT for table `subscription`
--
ALTER TABLE `subscription`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `subscription_feature`
--
ALTER TABLE `subscription_feature`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;

--
-- AUTO_INCREMENT for table `subscription_status`
--
ALTER TABLE `subscription_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `support_requests`
--
ALTER TABLE `support_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `support_request_messages`
--
ALTER TABLE `support_request_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `target_muscle`
--
ALTER TABLE `target_muscle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `usertype`
--
ALTER TABLE `usertype`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `user_discount_eligibility`
--
ALTER TABLE `user_discount_eligibility`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `user_training_preferences`
--
ALTER TABLE `user_training_preferences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=109;

--
-- AUTO_INCREMENT for table `user_warning_dismissals`
--
ALTER TABLE `user_warning_dismissals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `workout_session_log`
--
ALTER TABLE `workout_session_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `account_deactivation_log`
--
ALTER TABLE `account_deactivation_log`
  ADD CONSTRAINT `fk_deactivation_staff` FOREIGN KEY (`deactivated_by`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_deactivation_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD CONSTRAINT `activity_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `fk_attendance_guest` FOREIGN KEY (`guest_session_id`) REFERENCES `guest_session` (`id`);

--
-- Constraints for table `coaches`
--
ALTER TABLE `coaches`
  ADD CONSTRAINT `coaches_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `coach_availability`
--
ALTER TABLE `coach_availability`
  ADD CONSTRAINT `coach_availability_ibfk_1` FOREIGN KEY (`coach_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `coach_member_list`
--
ALTER TABLE `coach_member_list`
  ADD CONSTRAINT `coach_member_list_ibfk_1` FOREIGN KEY (`coach_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `coach_member_list_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `coach_member_list_ibfk_3` FOREIGN KEY (`handled_by_coach`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `coach_member_list_ibfk_4` FOREIGN KEY (`handled_by_staff`) REFERENCES `user` (`id`);

--
-- Constraints for table `coach_review`
--
ALTER TABLE `coach_review`
  ADD CONSTRAINT `coach_review_ibfk_1` FOREIGN KEY (`coach_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `coach_review_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `coach_session_usage`
--
ALTER TABLE `coach_session_usage`
  ADD CONSTRAINT `fk_coach_session_usage_member` FOREIGN KEY (`coach_member_id`) REFERENCES `coach_member_list` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `conversations`
--
ALTER TABLE `conversations`
  ADD CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`participant1_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`participant2_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `exercise_target_muscle`
--
ALTER TABLE `exercise_target_muscle`
  ADD CONSTRAINT `exercise_target_muscle_ibfk_1` FOREIGN KEY (`exercise_id`) REFERENCES `exercise` (`id`),
  ADD CONSTRAINT `exercise_target_muscle_ibfk_2` FOREIGN KEY (`muscle_id`) REFERENCES `target_muscle` (`id`);

--
-- Constraints for table `explore_program_workout`
--
ALTER TABLE `explore_program_workout`
  ADD CONSTRAINT `explore_program_workout_program_fk` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `membership`
--
ALTER TABLE `membership`
  ADD CONSTRAINT `membership_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `member_achievements`
--
ALTER TABLE `member_achievements`
  ADD CONSTRAINT `member_achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `member_profile_details` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `member_achievements_ibfk_2` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `member_exercise_log`
--
ALTER TABLE `member_exercise_log`
  ADD CONSTRAINT `member_exercise_log_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `member_exercise_log_ibfk_2` FOREIGN KEY (`member_workout_exercise_id`) REFERENCES `member_workout_exercise` (`id`);

--
-- Constraints for table `member_exercise_set_log`
--
ALTER TABLE `member_exercise_set_log`
  ADD CONSTRAINT `member_exercise_set_log_ibfk_1` FOREIGN KEY (`exercise_log_id`) REFERENCES `member_exercise_log` (`id`);

--
-- Constraints for table `member_fitness_goals`
--
ALTER TABLE `member_fitness_goals`
  ADD CONSTRAINT `member_fitness_goals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `member_profile_details`
--
ALTER TABLE `member_profile_details`
  ADD CONSTRAINT `member_profile_details_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `member_profile_details_ibfk_2` FOREIGN KEY (`gender_id`) REFERENCES `gender` (`id`);

--
-- Constraints for table `member_programhdr`
--
ALTER TABLE `member_programhdr`
  ADD CONSTRAINT `member_programhdr_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `member_programhdr_ibfk_2` FOREIGN KEY (`program_hdr_id`) REFERENCES `programhdr` (`id`),
  ADD CONSTRAINT `member_programhdr_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`);

--
-- Constraints for table `member_program_schedule`
--
ALTER TABLE `member_program_schedule`
  ADD CONSTRAINT `member_program_schedule_ibfk_1` FOREIGN KEY (`member_program_hdr_id`) REFERENCES `member_programhdr` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `member_program_schedule_ibfk_2` FOREIGN KEY (`workout_id`) REFERENCES `member_program_workout` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `member_program_workout`
--
ALTER TABLE `member_program_workout`
  ADD CONSTRAINT `member_program_workout_ibfk_1` FOREIGN KEY (`member_program_hdr_id`) REFERENCES `member_programhdr` (`id`);

--
-- Constraints for table `member_workout_exercise`
--
ALTER TABLE `member_workout_exercise`
  ADD CONSTRAINT `member_workout_exercise_ibfk_1` FOREIGN KEY (`member_program_workout_id`) REFERENCES `member_program_workout` (`id`),
  ADD CONSTRAINT `member_workout_exercise_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exercise` (`id`);

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `my_goals`
--
ALTER TABLE `my_goals`
  ADD CONSTRAINT `my_goals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `notification_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `notification_ibfk_2` FOREIGN KEY (`status_id`) REFERENCES `notification_status` (`id`),
  ADD CONSTRAINT `notification_ibfk_3` FOREIGN KEY (`type_id`) REFERENCES `notification_type` (`id`);

--
-- Constraints for table `payment`
--
ALTER TABLE `payment`
  ADD CONSTRAINT `payment_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `subscription` (`id`);

--
-- Constraints for table `personal_records`
--
ALTER TABLE `personal_records`
  ADD CONSTRAINT `personal_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `personal_records_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exercise` (`id`);

--
-- Constraints for table `programdetail`
--
ALTER TABLE `programdetail`
  ADD CONSTRAINT `programdetail_ibfk_1` FOREIGN KEY (`program_hdr_id`) REFERENCES `programhdr` (`id`);

--
-- Constraints for table `programhdr`
--
ALTER TABLE `programhdr`
  ADD CONSTRAINT `programhdr_ibfk_1` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`),
  ADD CONSTRAINT `programhdr_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`);

--
-- Constraints for table `program_review`
--
ALTER TABLE `program_review`
  ADD CONSTRAINT `program_review_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `program_review_ibfk_2` FOREIGN KEY (`program_hdr_id`) REFERENCES `programhdr` (`id`);

--
-- Constraints for table `program_workout`
--
ALTER TABLE `program_workout`
  ADD CONSTRAINT `program_workout_ibfk_1` FOREIGN KEY (`program_hdr_id`) REFERENCES `programhdr` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `program_workout_exercise`
--
ALTER TABLE `program_workout_exercise`
  ADD CONSTRAINT `program_workout_exercise_ibfk_1` FOREIGN KEY (`program_workout_id`) REFERENCES `program_workout` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `program_workout_exercise_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exercise` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `progress_tracker`
--
ALTER TABLE `progress_tracker`
  ADD CONSTRAINT `progress_tracker_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `progress_tracking`
--
ALTER TABLE `progress_tracking`
  ADD CONSTRAINT `progress_tracking_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `sales_details`
--
ALTER TABLE `sales_details`
  ADD CONSTRAINT `fk_sales_guest` FOREIGN KEY (`guest_session_id`) REFERENCES `guest_session` (`id`),
  ADD CONSTRAINT `sales_details_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`),
  ADD CONSTRAINT `sales_details_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`),
  ADD CONSTRAINT `sales_details_ibfk_3` FOREIGN KEY (`subscription_id`) REFERENCES `subscription` (`id`);

--
-- Constraints for table `subscription`
--
ALTER TABLE `subscription`
  ADD CONSTRAINT `subscription_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `subscription_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `member_subscription_plan` (`id`),
  ADD CONSTRAINT `subscription_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `subscription_status` (`id`);

--
-- Constraints for table `subscription_feature`
--
ALTER TABLE `subscription_feature`
  ADD CONSTRAINT `subscription_feature_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `member_subscription_plan` (`id`);

--
-- Constraints for table `support_requests`
--
ALTER TABLE `support_requests`
  ADD CONSTRAINT `fk_support_requests_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `support_request_messages`
--
ALTER TABLE `support_request_messages`
  ADD CONSTRAINT `fk_support_request_messages_request` FOREIGN KEY (`request_id`) REFERENCES `support_requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_support_request_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `target_muscle`
--
ALTER TABLE `target_muscle`
  ADD CONSTRAINT `target_muscle_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `target_muscle` (`id`);

--
-- Constraints for table `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `user_ibfk_1` FOREIGN KEY (`user_type_id`) REFERENCES `usertype` (`id`),
  ADD CONSTRAINT `user_ibfk_2` FOREIGN KEY (`gender_id`) REFERENCES `gender` (`id`);

--
-- Constraints for table `user_discount_eligibility`
--
ALTER TABLE `user_discount_eligibility`
  ADD CONSTRAINT `user_discount_eligibility_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_discount_eligibility_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `user` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `workout_session_log`
--
ALTER TABLE `workout_session_log`
  ADD CONSTRAINT `workout_session_log_ibfk_1` FOREIGN KEY (`member_program_hdr_id`) REFERENCES `member_programhdr` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
