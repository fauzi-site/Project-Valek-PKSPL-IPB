<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Comment Reply</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333333;">PKSPL Research Information System</h2>
        <hr style="border: 0; border-top: 1px solid #eeeeee;">
        
        <h3>New Reply to Your Comment</h3>
        <p>Hello,</p>
        <p>Someone has replied to your comment.</p>
        <p><strong>Reply by:</strong> {{ $reply->user->nama ?? 'Unknown' }}</p>
        
        <p><strong>Your Comment:</strong></p>
        <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; color: #777;">
            {{ $parent->body }}
        </blockquote>

        <p><strong>Their Reply:</strong></p>
        <blockquote style="border-left: 3px solid #007bff; padding-left: 10px; color: #333;">
            {{ $reply->body }}
        </blockquote>
        
        <p>Please log in to the system to view the discussion.</p>
        
        <br>
        <p>Thank you,</p>
        <p><strong>PKSPL System</strong></p>
    </div>
</body>
</html>
