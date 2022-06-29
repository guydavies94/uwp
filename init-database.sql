CREATE USER `uwpets`@`localhost` IDENTIFIED BY 'epLyV>j)3&,@KA-;Cgyn';
CREATE DATABASE `uwpets`;
GRANT ALL PRIVILEGES ON `uwpets`.* TO `uwpets`@`localhost`;
USE `uwpets`;

CREATE TABLE `people` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `age` INT NOT NULL
);

CREATE TABLE `pets` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `species` VARCHAR(255) NOT NULL,
    `age` INT NOT NULL,
    `person_id` INT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

INSERT INTO people
    (`name`, `email`, `age`)
VALUES
    ('Alice', 'alice@email.com', 25),
    ('Bob', 'bob@email.com', 26),
    ('Carol', 'carol@email.com', 27),
    ('Dan', 'dan@email.com', 28),
    ('Erin', 'erin@email.com', 29),
    ('Frank', 'frank@email.com', 30),
    ('Grace', 'grace@email.com', 31),
    ('Heidi', 'heidi@email.com', 32)
;

INSERT INTO pets
    (`name`, `species`, `age`, `person_id`)
VALUES
    ('Alex', 'Axolotl', 1, 1),
    ('Barry', 'Baboon', 2, 2),
    ('Carlos', 'Cat', 3, 2),
    ('Dave', 'Dog', 4, 3),
    ('Egbert', 'Earthworm', 1, 3),
    ('Frank', 'Flamingo', 4, 4),
    ('Gary', 'Giraffe', 5, 5),
    ('Helga', 'Hamster', 2, 5),
    ('Ian', 'Ibex', 6, 6),
    ('John', 'Jackrabbit', 3, 7),
    ('Kelly', 'Kangaroo', 3, 7)
;