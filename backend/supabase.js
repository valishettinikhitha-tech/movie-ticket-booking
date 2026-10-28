const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey || supabaseUrl.includes("YOUR_ACTUAL_PROJECT_ID")) {
    console.warn(
        "⚠️  [SUPABASE CONFIG WARNING] SUPABASE_URL or SUPABASE_SECRET_KEY is not configured with real credentials in backend/.env"
    );
}

const supabase = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseSecretKey || "placeholder-key",
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

module.exports = supabase;
