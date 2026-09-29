<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Dataset Submitted</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333333;">PKSPL Research Information System</h2>
        <hr style="border: 0; border-top: 1px solid #eeeeee;">
        
        <h3>Dataset Submitted for Review</h3>
        <p>Hello,</p>
        <p>A dataset has been submitted for review by <strong>{{ $submitter->nama ?? 'Unknown' }}</strong>.</p>
        <p><strong>Project Name:</strong> {{ $proyek->nama_proyek }}</p>
        
        <p>Please log in to the system to review the submission.</p>
        
        <br>
        <p>Thank you,</p>
        <p><strong>PKSPL System</strong></p>
    </div>
</body>
</html>
