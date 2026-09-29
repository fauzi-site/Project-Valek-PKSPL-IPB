<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ChatMessage;
use Illuminate\Console\Command;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Throwable;

class EncryptLegacyChatMessages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'chat:encrypt-legacy-messages
                            {--dry-run : Simulate the migration without saving changes to the database}
                            {--chunk=100 : The number of records to process per batch}
                            {--rollback : Decrypt already-encrypted messages back to plaintext}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrates existing chat messages in the database to AES-256 encrypted format (or decrypts them back)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isDryRun = (bool) $this->option('dry-run');
        $isRollback = (bool) $this->option('rollback');
        $chunkSize = max(1, (int) $this->option('chunk'));

        $modeText = $isRollback ? 'DECRYPTION (ROLLBACK)' : 'ENCRYPTION';
        $this->info("==================================================");
        $this->info(" PKSPL Chat Message {$modeText} Tool");
        if ($isDryRun) {
            $this->warn(" [DRY-RUN MODE] No changes will be committed to the database.");
        }
        $this->info("==================================================");

        $totalCount = DB::table('messages')->count();
        if ($totalCount === 0) {
            $this->info('No messages found in the database.');
            return self::SUCCESS;
        }

        $this->info("Total messages found: {$totalCount}");

        $processed = 0;
        $updated = 0;
        $alreadyInTargetState = 0;
        $emptyCount = 0;
        $failed = 0;

        $bar = $this->output->createProgressBar($totalCount);
        $bar->start();

        DB::table('messages')
            ->orderBy('id_message')
            ->chunk($chunkSize, function ($records) use (
                $isDryRun,
                $isRollback,
                &$processed,
                &$updated,
                &$alreadyInTargetState,
                &$emptyCount,
                &$failed,
                $bar
            ) {
                foreach ($records as $row) {
                    $processed++;
                    $id = $row->id_message;
                    $rawValue = $row->message;

                    if ($rawValue === null || trim((string) $rawValue) === '') {
                        $emptyCount++;
                        $bar->advance();
                        continue;
                    }

                    $isEncrypted = $this->isPayloadEncrypted((string) $rawValue);

                    if ($isRollback) {
                        // Rollback: we want plaintext
                        if (!$isEncrypted) {
                            $alreadyInTargetState++;
                        } else {
                            try {
                                $decrypted = Crypt::decryptString((string) $rawValue);
                                if (!$isDryRun) {
                                    DB::table('messages')
                                        ->where('id_message', $id)
                                        ->update(['message' => $decrypted]);
                                }
                                $updated++;
                            } catch (Throwable $e) {
                                $failed++;
                                $this->error("\nFailed to decrypt message ID {$id}: " . $e->getMessage());
                            }
                        }
                    } else {
                        // Migration: we want ciphertext
                        if ($isEncrypted) {
                            $alreadyInTargetState++;
                        } else {
                            try {
                                $encrypted = Crypt::encryptString((string) $rawValue);
                                if (!$isDryRun) {
                                    DB::table('messages')
                                        ->where('id_message', $id)
                                        ->update(['message' => $encrypted]);
                                }
                                $updated++;
                            } catch (Throwable $e) {
                                $failed++;
                                $this->error("\nFailed to encrypt message ID {$id}: " . $e->getMessage());
                            }
                        }
                    }

                    $bar->advance();
                }
            });

        $bar->finish();
        $this->newLine(2);

        $this->info("---------------- Summary ----------------");
        $this->info("Total scanned:             {$processed}");
        $this->info("Already in target format:  {$alreadyInTargetState}");
        $this->info("Newly converted:           {$updated}" . ($isDryRun ? " (simulated)" : ""));
        $this->info("Empty/Null messages:       {$emptyCount}");
        if ($failed > 0) {
            $this->error("Failed:                    {$failed}");
        }

        $this->info("-----------------------------------------");
        $this->info($isDryRun ? "Dry run completed." : "Migration completed successfully.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Check if a raw string value is already an encrypted payload from Laravel's Crypt service.
     */
    private function isPayloadEncrypted(string $value): bool
    {
        try {
            $decoded = base64_decode($value, true);
            if ($decoded === false) {
                return false;
            }

            $json = json_decode($decoded, true);
            if (!is_array($json) || !isset($json['iv'], $json['value'], $json['mac'])) {
                return false;
            }

            // Verify with decryption test
            Crypt::decryptString($value);
            return true;
        } catch (DecryptException) {
            return false;
        } catch (Throwable) {
            return false;
        }
    }
}
