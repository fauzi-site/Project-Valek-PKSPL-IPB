<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Master data role yang dapat diberikan kepada pengguna.
 *
 * Nama role disimpan sebagai nilai tetap karena schema tidak memiliki tabel
 * permission atau relasi role-permission.
 */
class Role extends Model
{
    public const SUPER_ADMIN = 'Super Admin';

    public const ADMIN = self::SUPER_ADMIN;

    public const ADMINISTRATOR = self::SUPER_ADMIN;

    public const PENELITI = 'Peneliti';

    public const GUEST = 'Guest';

    /**
     * Normalisasi nama role untuk memastikan alias seperti "Admin" atau "Administrator"
     * dapat dibandingkan dengan nama role yang tersimpan di database.
     */
    public static function normalize(string $role): string
    {
        return match (strtolower(trim($role))) {
            'admin', 'administrator', 'super admin', 'super_admin' => self::SUPER_ADMIN,
            default => $role,
        };
    }

    /**
     * Primary key role tidak mengikuti konvensi default Eloquent.
     */
    protected $primaryKey = 'id_role';

    /**
     * @var list<string>
     */
    protected $fillable = ['id_role', 'nama_role', 'deskripsi'];

    /**
     * Mengembalikan daftar role yang diizinkan oleh aplikasi.
     *
     * @return list<string>
     */
    public static function names(): array
    {
        return [self::SUPER_ADMIN, self::PENELITI, self::GUEST];
    }

    /**
     * Menggunakan primary key schema untuk route model binding.
     */
    public function getRouteKeyName(): string
    {
        return 'id_role';
    }

    /**
     * Satu role dapat dimiliki oleh banyak pengguna.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'id_role', 'id_role');
    }
}
