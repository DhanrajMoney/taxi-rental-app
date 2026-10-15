<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function ($user, string $token): string {
            return rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/')
                .'/?reset_token='.urlencode($token)
                .'&email='.urlencode($user->getEmailForPasswordReset());
        });
    }
}
