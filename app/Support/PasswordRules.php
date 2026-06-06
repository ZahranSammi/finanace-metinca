<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

class PasswordRules
{
    /**
     * Convert the given Password rules into an HTML passwordrules attribute string.
     */
    public static function toString(?Password $password = null): string
    {
        $password = $password ?: Password::defaults();
        
        $rules = [];
        $reflector = new \ReflectionClass($password);
        
        $getProperty = function ($name) use ($reflector, $password) {
            if ($reflector->hasProperty($name)) {
                $property = $reflector->getProperty($name);
                $property->setAccessible(true);
                return $property->getValue($password);
            }
            return null;
        };

        $min = $getProperty('min') ?: 8;
        $rules[] = "minlength: {$min}";

        if ($getProperty('mixedCase')) {
            $rules[] = "required: lower";
            $rules[] = "required: upper";
        }
        if ($getProperty('numbers')) {
            $rules[] = "required: digit";
        }
        if ($getProperty('symbols')) {
            $rules[] = "required: special";
        }

        return implode('; ', $rules) . ';';
    }
}
