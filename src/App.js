import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from "react";
import cheerio from "cheerio";

export const App = () => {
  const [url, setUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [error, setError] = useState({ status: false, text: "" });
  const [siteData, setSiteData] = useState(null);

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    setError({ status: false, text: "" });
  };

  const handleButtonClick = async (e) => {
    e.preventDefault();
    if (!url) {
      setError({ status: true, text: "URL is required" });
      return;
    }
    setError({ status: true, text: "" });

    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
    if (!urlRegex.test(url)) {
      setIsValidUrl(false);
      setError({ status: true, text: "Invalid URL" });
      return;
    }

    setIsValidUrl(true);
    setError({ status: false, text: "" });

    const SCRAPINGBEE_API_ENDPOINT = `https://app.scrapingbee.com/api/v1/?api_key=${
      process.env.REACT_APP_API_KEY
    }&url=${encodeURIComponent(url)}`;
    const SCRAPINGBEE_RESPONSE = await fetch(SCRAPINGBEE_API_ENDPOINT);

    const SCRAPINGBEE_DATA = await SCRAPINGBEE_RESPONSE.text();

    const SAFE_BROWSING_API_ENDPOINT = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.REACT_APP_SAFE_BROWSING_API_KEY}`;
    const SAFE_BROWSING_BODY = {
      client: {
        clientId: "myapp",
        clientVersion: "1.0.0",
      },
      threatInfo: {
        threatTypes: [
          "MALWARE",
          "SOCIAL_ENGINEERING",
          "UNWANTED_SOFTWARE",
          "POTENTIALLY_HARMFUL_APPLICATION",
        ],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [
          {
            url,
          },
        ],
      },
    };

    const SAFE_BROWSING_RESPONSE = await fetch(SAFE_BROWSING_API_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(SAFE_BROWSING_BODY),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const SAFE_BROWSING_DATA = await SAFE_BROWSING_RESPONSE.json();

    if (SCRAPINGBEE_DATA.is_error || SAFE_BROWSING_DATA.matches) {
      setSiteData(null);
      setError({
        status: true,
        text: "Malicious URL. Try with a different URL.",
      });
      return;
    }

    setError({ status: false, text: "" });

    const $ = cheerio.load(SCRAPINGBEE_DATA);
    const title = $("title").text();
    const description = $('meta[name="description"]').attr("content");
    const author = $('meta[name="author"]').attr("content");
    const image = $('meta[property="og:image"]').attr("content");
    const type = $('meta[property="og:type"]').attr("content");
    const canonicalUrl = $('link[rel="canonical"]').attr("href");
    const locale = $("html").attr("lang");
    const publishedDate =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[property="og:article:published_time"]').attr("content");

    setSiteData({
      title,
      description,
      author,
      image,
      type,
      canonicalUrl,
      locale,
      publishedDate,
    });
  };

  return (
    <div className="container">
      <form className="form-group">
        <div className="row">
          <div className="col-8 mt-3">
            <input
              type="text"
              className="form-control"
              placeholder="Enter Url to get info"
              value={url}
              onChange={handleUrlChange}
              style={{
                border: !isValidUrl ? "2px solid red" : "",
              }}
            />
            {error.status && <p className="text-danger mt-2">{error.text}</p>}
            <button
              onClick={handleButtonClick}
              className="btn btn-primary mt-2"
            >
              Check URL
            </button>
          </div>
        </div>
      </form>

      {siteData ? (
        <div className="mt-3">
          <h2>{siteData.title}</h2>
          <p>{siteData.description}</p>
          <ul>
            <li>Author: {siteData.author}</li>
            <li>Type: {siteData.type}</li>
            <li>URL: {siteData.canonicalUrl}</li>
            <li>Locale: {siteData.locale}</li>
            <li>Published Date: {siteData.publishedDate}</li>
          </ul>
          <img src={siteData.image} alt="" className="img-fluid mt-3" />
        </div>
      ) : null}
    </div>
  );
};

export default App;
