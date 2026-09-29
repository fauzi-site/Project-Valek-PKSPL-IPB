<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>You Were Mentioned</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333333;">PKSPL Research Information System</h2>
        <hr style="border: 0; border-top: 1px solid #eeeeee;">
        
        <h3>You Were Mentioned in a Comment</h3>
        <p>Hello,</p>
        <p>You have been mentioned in a comment by <strong>{{ $comment->user->nama ?? 'Unknown' }}</strong>.</p>
        
        <p><strong>Comment:</strong></p>
        <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; color: #555;">
            {{ $comment->body }}
        </blockquote>
        
        <p>Please log in to the system to view and reply.</p>
        
        <br>
        <p>Thank you,</p>
        <p><strong>PKSPL System</strong></p>
    </div>
</body>
</html>
