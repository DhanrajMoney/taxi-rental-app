<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\DriverDocumentController;
use App\Http\Controllers\Api\ImportController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OfficeController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\TaxiController;
use App\Http\Controllers\Api\TaxiDocumentController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('dashboard/overview', [DashboardController::class, 'overview']);
    Route::get('maintenance', [MaintenanceController::class, 'index']);
    Route::get('maintenance/{maintenance}', [MaintenanceController::class, 'show']);
    Route::get('taxis', [TaxiController::class, 'index']);
    Route::get('taxis/{taxi}/documents', [TaxiDocumentController::class, 'index']);
    Route::get('taxis/{taxi}/documents/{document}/file', [TaxiDocumentController::class, 'download']);
    Route::get('taxis/{taxi}', [TaxiController::class, 'show']);
    Route::get('drivers', [DriverController::class, 'index']);
    Route::get('drivers/{driver}', [DriverController::class, 'show']);
    Route::get('drivers/{driver}/documents', [DriverDocumentController::class, 'index']);
    Route::get('drivers/{driver}/documents/{document}/file', [DriverDocumentController::class, 'download']);
    Route::get('bookings', [BookingController::class, 'index']);
    Route::get('bookings/{booking}', [BookingController::class, 'show']);
    Route::get('offices', [OfficeController::class, 'index']);
    Route::get('offices/{office}', [OfficeController::class, 'show']);
    Route::get('customers', [CustomerController::class, 'index']);
    Route::get('customers/{customer}', [CustomerController::class, 'show']);
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::put('profile', [ProfileController::class, 'updateProfile']);
    Route::post('profile/change-password', [ProfileController::class, 'changePassword']);
    Route::get('profile/login-activity', [ProfileController::class, 'loginActivity']);
    Route::get('settings', [SettingController::class, 'index']);

    Route::middleware('role:admin')->group(function () {
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store']);
        Route::get('users/{user}', [UserController::class, 'show']);
        Route::put('users/{user}', [UserController::class, 'update']);
        Route::patch('users/{user}', [UserController::class, 'update']);
        Route::delete('users/{user}', [UserController::class, 'destroy']);

        Route::post('offices', [OfficeController::class, 'store']);
        Route::put('offices/{office}', [OfficeController::class, 'update']);
        Route::patch('offices/{office}', [OfficeController::class, 'update']);
        Route::delete('offices/{office}', [OfficeController::class, 'destroy']);

        Route::get('imports/templates/{type}', [ImportController::class, 'template']);
        Route::post('imports/preview', [ImportController::class, 'preview']);
        Route::post('imports/confirm', [ImportController::class, 'confirm']);
        Route::get('imports/history', [ImportController::class, 'history']);

        Route::put('settings', [SettingController::class, 'update']);
    });

    Route::middleware('role:admin,staff')->group(function () {
        Route::get('maintenance/{maintenance}/bill', [MaintenanceController::class, 'downloadBill']);
        Route::post('maintenance', [MaintenanceController::class, 'store']);
        Route::put('maintenance/{maintenance}', [MaintenanceController::class, 'update']);
        Route::patch('maintenance/{maintenance}', [MaintenanceController::class, 'update']);
        Route::delete('maintenance/{maintenance}', [MaintenanceController::class, 'destroy']);

        Route::post('taxis', [TaxiController::class, 'store']);
        Route::post('taxis/{taxi}/documents', [TaxiDocumentController::class, 'store']);
        Route::delete('taxis/{taxi}/documents/{document}', [TaxiDocumentController::class, 'destroy']);
        Route::put('taxis/{taxi}', [TaxiController::class, 'update']);
        Route::patch('taxis/{taxi}', [TaxiController::class, 'update']);
        Route::delete('taxis/{taxi}', [TaxiController::class, 'destroy']);

        Route::post('drivers', [DriverController::class, 'store']);
        Route::post('drivers/{driver}/documents', [DriverDocumentController::class, 'store']);
        Route::delete('drivers/{driver}/documents/{document}', [DriverDocumentController::class, 'destroy']);
        Route::put('drivers/{driver}', [DriverController::class, 'update']);
        Route::patch('drivers/{driver}', [DriverController::class, 'update']);
        Route::delete('drivers/{driver}', [DriverController::class, 'destroy']);

        Route::post('bookings', [BookingController::class, 'store']);
        Route::put('bookings/{booking}', [BookingController::class, 'update']);
        Route::patch('bookings/{booking}', [BookingController::class, 'update']);
        Route::delete('bookings/{booking}', [BookingController::class, 'destroy']);

        Route::post('customers', [CustomerController::class, 'store']);
        Route::put('customers/{customer}', [CustomerController::class, 'update']);
        Route::patch('customers/{customer}', [CustomerController::class, 'update']);
        Route::delete('customers/{customer}', [CustomerController::class, 'destroy']);
    });
});
