<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Comment</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333333;">PKSPL Research Information System</h2>
        <hr style="border: 0; border-top: 1px solid #eeeeee;">
        
        <h3>New Comment on Dataset</h3>
        <p>Hello,</p>
        <p>A new comment has been posted on the dataset for the project <strong>{{ $proyek->nama_proyek }}</strong>.</p>
        <p><strong>Comment by:</strong> {{ $comment->user->nama ?? 'Unknown' }}</p>
        
        <p><strong>Comment:</strong></p>
        <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; color: #555;">
            {{ $comment->body }}
        </blockquote>
        
        <p>Please log in to the system to reply or view more details.</p>
        
        <br>
        <p>Thank you,</p>
        <p><strong>PKSPL System</strong></p>
    </div>
</body>
</html>
