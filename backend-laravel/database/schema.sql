-- Fleet-table reference only. Laravel migrations define the complete application schema.
-- RideDesk: Taxi & Driver schema (MySQL 8+)
CREATE DATABASE IF NOT EXISTS ridedesk CHARACTER SET utf8mb4;
USE ridedesk;

CREATE TABLE drivers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) NULL,
  gender VARCHAR(30) NULL,
  license_number VARCHAR(50) NOT NULL UNIQUE,
  license_expiry DATE NOT NULL,
  insurance_expiry DATE NULL,
  document_expiry DATE NULL,
  required_document_expiry DATE NULL,
  address TEXT NULL,
  joining_date DATE NOT NULL,
  status ENUM('active','on_trip','on_leave','inactive') NOT NULL DEFAULT 'active',
  photo_path VARCHAR(255) NULL,
  document_path VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE TABLE taxis (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reg_number VARCHAR(30) NOT NULL UNIQUE,
  vehicle_type ENUM('sedan','suv','hatchback','mini_bus') NOT NULL,
  make_model VARCHAR(100) NOT NULL,
  year_of_manufacture SMALLINT NOT NULL,
  seating_capacity TINYINT NOT NULL,
  fuel_type ENUM('petrol','diesel','cng','ev') NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  status ENUM('available','on_rent','maintenance','inactive') NOT NULL DEFAULT 'available',
  driver_id BIGINT UNSIGNED NULL,
  odometer_reading INT UNSIGNED NOT NULL DEFAULT 0,
  document_path VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_taxi_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

CREATE INDEX idx_taxis_status_deleted_at ON taxis(status, deleted_at);
CREATE INDEX idx_drivers_status_deleted_at ON drivers(status, deleted_at);
CREATE INDEX idx_drivers_deleted_at_license_expiry ON drivers(deleted_at, license_expiry);
