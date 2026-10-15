<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Driver;
use App\Models\Taxi;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@ridedesk.test'],
            [
                'name' => 'RideDesk Admin',
                'password' => 'password',
                'role' => 'admin',
            ],
        );

        User::updateOrCreate(
            ['email' => 'staff@ridedesk.test'],
            [
                'name' => 'RideDesk Staff',
                'password' => 'password',
                'role' => 'staff',
            ],
        );

        $firstTaxi = Taxi::updateOrCreate(
            ['reg_number' => 'RRD-1001'],
            [
                'vehicle_type' => 'sedan',
                'make_model' => 'Maruti Dzire',
                'year_of_manufacture' => 2024,
                'seating_capacity' => 4,
                'fuel_type' => 'petrol',
                'pricing_type' => 'daily',
                'rate_amount' => 1800,
                'daily_rate' => 1800,
                'status' => 'available',
                'odometer_reading' => 18400,
            ],
        );

        $secondTaxi = Taxi::updateOrCreate(
            ['reg_number' => 'RRD-1002'],
            [
                'vehicle_type' => 'suv',
                'make_model' => 'Kia Carens',
                'year_of_manufacture' => 2023,
                'seating_capacity' => 6,
                'fuel_type' => 'diesel',
                'pricing_type' => 'daily',
                'rate_amount' => 2600,
                'daily_rate' => 2600,
                'status' => 'available',
                'odometer_reading' => 29100,
            ],
        );

        $firstDriver = Driver::firstOrCreate(
            ['phone' => '+91 90000 10001'],
            [
                'name' => 'Aarav Mehta',
                'email' => 'aarav.driver@ridedesk.test',
                'license_number' => 'DL-RR-1001',
                'license_expiry' => now()->addYears(2)->toDateString(),
                'joining_date' => now()->subYear()->toDateString(),
                'status' => 'active',
            ],
        );

        $secondDriver = Driver::firstOrCreate(
            ['phone' => '+91 90000 10002'],
            [
                'name' => 'Diya Sharma',
                'email' => 'diya.driver@ridedesk.test',
                'license_number' => 'DL-RR-1002',
                'license_expiry' => now()->addYears(1)->toDateString(),
                'joining_date' => now()->subMonths(6)->toDateString(),
                'status' => 'active',
            ],
        );

        User::updateOrCreate(
            ['email' => 'driver@ridedesk.test'],
            [
                'name' => 'Aarav Mehta',
                'password' => 'password',
                'role' => 'driver',
                'driver_id' => $firstDriver->id,
            ],
        );

        $firstDriver->documents()->updateOrCreate(
            ['document_name' => 'Commercial Heavy Vehicle Driving License'],
            [
                'type' => 'license',
                'file_path' => 'driver_documents/'.$firstDriver->id.'/driving_license.pdf',
                'file_size' => '1.4 MB',
                'expiry_date' => now()->addYears(2)->toDateString(),
                'status' => 'Valid',
            ]
        );

        $firstDriver->documents()->updateOrCreate(
            ['document_name' => 'Driver Passenger Liability Insurance Policy'],
            [
                'type' => 'insurance',
                'file_path' => 'driver_documents/'.$firstDriver->id.'/driver_insurance.pdf',
                'file_size' => '2.1 MB',
                'expiry_date' => now()->addDays(20)->toDateString(),
                'status' => 'Expiring soon',
            ]
        );

        $firstDriver->documents()->updateOrCreate(
            ['document_name' => 'Police Background Clearance Certificate'],
            [
                'type' => 'background_check',
                'file_path' => 'driver_documents/'.$firstDriver->id.'/police_clearance.pdf',
                'file_size' => '840 KB',
                'expiry_date' => now()->addMonths(6)->toDateString(),
                'status' => 'Valid',
            ]
        );

        $dummyDir = storage_path('app/public/driver_documents/'.$firstDriver->id);
        if (! file_exists($dummyDir)) {
            mkdir($dummyDir, 0755, true);
        }
        file_put_contents($dummyDir.'/driving_license.pdf', '%PDF-1.4 Sample License Document');
        file_put_contents($dummyDir.'/driver_insurance.pdf', '%PDF-1.4 Sample Insurance Document');
        file_put_contents($dummyDir.'/police_clearance.pdf', '%PDF-1.4 Sample Background Clearance');

        $bookings = [
            ['name' => 'Neha Kapoor', 'phone' => '+91 98888 11001', 'start' => 2, 'days' => 2, 'location' => 'New Delhi Railway Station', 'taxi' => $firstTaxi, 'driver' => $firstDriver, 'status' => 'confirmed'],
            ['name' => 'Rohan Malhotra', 'phone' => '+91 98888 11002', 'start' => 5, 'days' => 1, 'location' => 'Indira Gandhi International Airport', 'taxi' => $secondTaxi, 'driver' => $secondDriver, 'status' => 'pending'],
            ['name' => 'Priya Singh', 'phone' => '+91 98888 11003', 'start' => -1, 'days' => 3, 'location' => 'Gurugram Cyber Hub', 'taxi' => null, 'driver' => null, 'status' => 'active'],
            ['name' => 'Kabir Joshi', 'phone' => '+91 98888 11004', 'start' => 10, 'days' => 4, 'location' => 'Noida Sector 18', 'taxi' => null, 'driver' => null, 'status' => 'pending'],
        ];

        foreach ($bookings as $booking) {
            $pickupDate = now()->addDays($booking['start'])->toDateString();
            $returnDate = now()->addDays($booking['start'] + $booking['days'])->toDateString();
            $days = $booking['days'] + 1;
            $taxi = $booking['taxi'];
            $pricingType = $taxi ? ($taxi->pricing_type ?: 'daily') : null;
            $rateAmount = $taxi ? ($taxi->rate_amount ?: $taxi->daily_rate) : null;
            $estimatedFare = ($taxi && $rateAmount) ? round((float) $rateAmount * $days, 2) : null;

            Booking::updateOrCreate(
                ['customer_phone' => $booking['phone'], 'pickup_date' => $pickupDate],
                [
                    'customer_name' => $booking['name'],
                    'return_date' => $returnDate,
                    'pickup_location' => $booking['location'],
                    'drop_location' => $booking['location'].' Drop Point',
                    'taxi_id' => $taxi?->id,
                    'driver_id' => $booking['driver']?->id,
                    'pricing_type' => $pricingType,
                    'rate_amount' => $rateAmount,
                    'estimated_fare' => $estimatedFare,
                    'status' => $booking['status'],
                    'notes' => 'Demo booking created by the local development seeder.',
                ],
            );
        }
    }
}
