<?php

namespace App\Models;

/**
 * Backward-compatible Member model that bridges to the Customer model & customers table.
 */
class Member extends Customer
{
    protected $table = 'customers';
}
