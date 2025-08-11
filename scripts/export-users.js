const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config({ path: ".env" });

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function exportUsers() {
	try {
		let allUsers = [];
		let pageToken = undefined;
		const perPage = 10000;
		let pageCount = 0;
		let totalUsers = 0;
		const delayMs = 500; // Delay between requests to avoid rate limits
		const csvFilename = "auth_users.csv";
		const jsonFilename = "auth_users.json";
		let isFirstBatch = true;

		console.log("Fetching users from Supabase (1000 per batch)...");
		console.log("Adding delay between requests to avoid rate limits...\n");

		// Clear existing files or create new ones
		fs.writeFileSync(csvFilename, "");
		fs.writeFileSync(jsonFilename, "[\n");

		do {
			pageCount++;

			// Build options for listUsers
			const options = {
				perPage: perPage,
			};

			// Add page token if we have one (for cursor-based pagination)
			if (pageToken) {
				options.page = pageToken;
			}

			const { data, error } = await supabase.auth.admin.listUsers(options);

			if (error) throw error;

			totalUsers += data.users.length;
			console.log(
				`Fetched batch ${pageCount}: ${data.users.length} users (Total: ${totalUsers})`,
			);

			// Convert batch to CSV rows
			if (data.users.length > 0) {
				const csvData = data.users.map((user) => ({
					id: user.id,
					email: user.email,
					created_at: user.created_at,
					last_sign_in_at: user.last_sign_in_at,
					email_confirmed_at: user.email_confirmed_at,
					phone: user.phone || "",
					provider: user.app_metadata?.provider || "",
					role: user.role || "",
				}));

				// Write CSV header only for first batch
				if (isFirstBatch) {
					const headers = Object.keys(csvData[0]).join(",");
					fs.appendFileSync(csvFilename, headers + "\n");
				}

				// Append CSV rows
				const rows = csvData.map((user) =>
					Object.values(user)
						.map((value) =>
							value === null ? "" : `"${String(value).replace(/"/g, '""')}"`,
						)
						.join(","),
				);
				fs.appendFileSync(csvFilename, rows.join("\n") + "\n");

				// Append to JSON file
				const jsonRows = data.users.map((user, index) => {
					const jsonStr = JSON.stringify(user, null, 2);
					const indentedStr = jsonStr
						.split("\n")
						.map((line) => "  " + line)
						.join("\n");
					const prefix = isFirstBatch && index === 0 ? "" : ",\n";
					return prefix + indentedStr;
				});
				fs.appendFileSync(jsonFilename, jsonRows.join(""));

				allUsers = allUsers.concat(data.users);
				isFirstBatch = false;
			}

			// Update page token for next iteration
			pageToken = data.nextPage;

			// Add delay to avoid rate limits if we're fetching more pages
			if (pageToken) {
				console.log(`Waiting ${delayMs}ms before next request...`);
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		} while (pageToken);

		// Close JSON array
		fs.appendFileSync(jsonFilename, "\n]");

		console.log(`\nExport complete! Total users exported: ${totalUsers}`);
		console.log(`Files created: ${jsonFilename} and ${csvFilename}`);
	} catch (error) {
		console.error("Error:", error);
	}
}

function convertToCSV(users) {
	if (users.length === 0) return "";

	// Extract common fields for CSV
	const csvData = users.map((user) => ({
		id: user.id,
		email: user.email,
		created_at: user.created_at,
		last_sign_in_at: user.last_sign_in_at,
		email_confirmed_at: user.email_confirmed_at,
		phone: user.phone || "",
		provider: user.app_metadata?.provider || "",
		role: user.role || "",
	}));

	const headers = Object.keys(csvData[0]).join(",");
	const rows = csvData.map((user) =>
		Object.values(user)
			.map((value) =>
				value === null ? "" : `"${String(value).replace(/"/g, '""')}"`,
			)
			.join(","),
	);
	return [headers, ...rows].join("\n");
}

exportUsers();
