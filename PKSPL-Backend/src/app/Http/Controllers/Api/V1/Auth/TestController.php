<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class TestController extends Controller
{
    /**
     * Endpoint untuk menguji hak akses Super Admin.
     */
    public function admin(): JsonResponse
    {
        return response()->json(['message' => 'Super Admin access granted.']);
    }

    /**
     * Endpoint untuk menguji hak akses Peneliti.
     */
    public function peneliti(): JsonResponse
    {
        return response()->json(['message' => 'Peneliti access granted.']);
    }

    /**
     * Endpoint untuk menguji hak akses Guest.
     */
    public function guest(): JsonResponse
    {
        return response()->json(['message' => 'Guest access granted.']);
    }
}
