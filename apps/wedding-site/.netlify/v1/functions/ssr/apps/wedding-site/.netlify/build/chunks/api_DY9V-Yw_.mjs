const API_BASE_URL = "http://localhost:3001/api";
async function fetchSiteConfig(slug) {
  try {
    const response = await fetch(`${API_BASE_URL}/site-config/${slug}`);
    if (!response.ok) {
      console.error(`Failed to fetch site config for ${slug}: ${response.status}`);
      return null;
    }
    const result = await response.json();
    if (!result.ok) {
      console.error(`API error for ${slug}: ${result.error}`);
      return null;
    }
    return result.data;
  } catch (error) {
    console.error(`Error fetching site config for ${slug}:`, error);
    return null;
  }
}
async function fetchRsvpView(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/rsvp/view?token=${encodeURIComponent(token)}`);
    const result = await response.json();
    if (!result.ok) {
      return { data: null, error: result.error };
    }
    return { data: result.data, error: null };
  } catch (error) {
    console.error("Error fetching RSVP view:", error);
    return { data: null, error: "NETWORK_ERROR" };
  }
}

export { fetchSiteConfig as a, fetchRsvpView as f };
