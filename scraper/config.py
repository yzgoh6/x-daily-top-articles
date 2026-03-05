"""Configuration for categories, keywords, and search queries.

Keywords use (keyword, weight) tuples.
  - weight 3: strong signal, very specific to category (e.g. "OpenAI" → AI)
  - weight 2: good signal (e.g. "machine learning" → AI)
  - weight 1: weak signal, needs multiple hits (e.g. "cloud" → Tech)

Keywords starting with r'\b' are matched with word boundaries automatically.
Multi-word phrases are matched as substrings (already specific enough).
"""

# Minimum total score to assign a category (otherwise → Other)
MIN_SCORE_THRESHOLD = 3

CATEGORIES = {
    "AI": {
        "priority": 1,
        "keywords": [
            # Strong signals (weight 3) — AI companies & products
            ("OpenAI", 3), ("Anthropic", 3), ("Claude", 3), ("ChatGPT", 3),
            ("GPT-4", 3), ("GPT-5", 3), ("Gemini AI", 3), ("Grok", 3),
            ("DeepMind", 3), ("DeepSeek", 3), ("MiniMax", 3), ("Mistral", 3),
            ("Cohere", 3), ("Hugging Face", 3), ("HuggingFace", 3),
            ("xAI", 3), ("Meta AI", 3), ("Llama", 3), ("Qwen", 3),
            ("Stability AI", 3), ("Runway", 3), ("ElevenLabs", 3),
            ("Pika", 3), ("Kling", 3), ("Cursor", 3), ("Windsurf", 3),
            ("Replit", 3), ("v0", 3), ("Bolt", 3),
            # Strong signals (weight 3) — AI concepts & products
            ("artificial intelligence", 3), ("machine learning", 3),
            ("deep learning", 3), ("large language model", 3),
            ("foundation model", 3), ("Midjourney", 3), ("Stable Diffusion", 3),
            ("AGI", 3), ("DALL-E", 3), ("Sora", 3),
            ("AlphaFold", 3), ("AlphaGo", 3), ("AlphaGeometry", 3),
            ("AlphaGenome", 3), ("Copilot", 3), ("Perplexity", 3),
            ("reasoning model", 3), ("Opus", 3), ("Sonnet", 3),
            ("Claude Code", 3), ("GitHub Copilot", 3),
            # Medium signals (weight 2)
            ("LLM", 2), ("neural network", 2), ("transformer", 2),
            ("NLP", 2), ("computer vision", 2), ("reinforcement learning", 2),
            ("diffusion model", 2), ("fine-tuning", 2), ("RAG", 2),
            ("prompt engineering", 2), ("embeddings", 2), ("GPT", 2),
            ("agentic", 2), ("AI system", 2), ("AI model", 2),
            ("text-to-image", 2), ("text-to-video", 2), ("AI agent", 2),
            ("AI coding", 2), ("vibe coding", 2),
            # Weak signals (weight 1) - need multiple hits
            ("AI", 1), ("chatbot", 1), ("model", 1), ("training", 1),
            ("inference", 1), ("Gemini", 1), ("Alpha", 1),
        ],
        "search_queries": [
            "AI breakthrough min_faves:500",
            "LLM GPT Claude min_faves:300",
        ],
    },
    "Tech": {
        "priority": 2,
        "keywords": [
            # Strong signals (weight 3) — tech companies
            ("software engineering", 3), ("programming", 3), ("open source", 3),
            ("cybersecurity", 3), ("semiconductor", 3),
            ("SaaS", 3), ("DevOps", 3), ("Kubernetes", 3), ("Docker", 3),
            ("Apple", 3), ("iPhone", 3), ("iPad", 3), ("MacBook", 3), ("iOS", 3),
            ("Google", 3), ("Android", 3), ("Pixel", 3), ("Chrome", 3),
            ("Microsoft", 3), ("Windows", 3), ("Azure", 3),
            ("Amazon", 3), ("AWS", 3), ("Tesla", 3), ("SpaceX", 3),
            ("Meta", 3), ("Samsung", 3), ("NVIDIA", 3), ("TSMC", 3),
            ("Intel", 3), ("AMD", 3), ("Qualcomm", 3),
            # Medium signals (weight 2)
            ("React", 2), ("Python", 2), ("JavaScript", 2), ("TypeScript", 2),
            ("Rust", 2), ("Go lang", 2), ("Swift", 2), ("Kotlin", 2),
            ("developer", 2), ("GitHub", 2), ("Linux", 2), ("Next.js", 2),
            ("Vercel", 2), ("Cloudflare", 2), ("Supabase", 2),
            ("5G", 2), ("AR", 2), ("VR", 2), ("Vision Pro", 2),
            # Weak signals (weight 1)
            ("software", 1), ("tech", 1), ("API", 1), ("cloud", 1),
            ("code", 1), ("chip", 1), ("app", 1),
        ],
        "search_queries": [
            "tech news min_faves:500",
            "software engineering min_faves:300",
        ],
    },
    "Crypto": {
        "priority": 3,
        "keywords": [
            ("cryptocurrency", 3), ("bitcoin", 3), ("ethereum", 3),
            ("blockchain", 3), ("DeFi", 3), ("Web3", 3), ("Solana", 3),
            ("Binance", 3), ("Coinbase", 3), ("stablecoin", 3),
            ("NFT", 2), ("altcoin", 2), ("memecoin", 2), ("airdrop", 2),
            ("BTC", 2), ("ETH", 2), ("DOGE", 2), ("XRP", 2),
            ("crypto", 2), ("Kaspa", 3), ("Cardano", 3), ("Polkadot", 3),
            ("token", 1), ("mining", 1), ("wallet", 1), ("coin", 1),
        ],
        "search_queries": [
            "crypto bitcoin min_faves:500",
            "DeFi Web3 blockchain min_faves:300",
        ],
    },
    "Finance": {
        "priority": 4,
        "keywords": [
            ("stock market", 3), ("Wall Street", 3), ("hedge fund", 3),
            ("S&P 500", 3), ("NASDAQ", 3), ("interest rate", 3),
            ("Federal Reserve", 3), ("circuit breaker", 3),
            ("investment", 2), ("portfolio", 2), ("investing", 2),
            ("ETF", 2), ("dividend", 2), ("forex", 2), ("bond", 2),
            ("earnings", 2), ("IPO", 2), ("Yen", 2), ("currency", 2),
            ("bull market", 2), ("bear market", 2), ("stock picks", 3),
            ("finance", 1), ("stock", 1), ("trading", 1), ("market", 1),
            ("revenue", 1), ("Fed", 1), ("investor", 1),
        ],
        "search_queries": [
            "finance investing min_faves:500",
            "stock market min_faves:300",
        ],
    },
    "Business": {
        "priority": 5,
        "keywords": [
            ("acquisition", 3), ("supply chain", 3), ("e-commerce", 3),
            ("enterprise", 2), ("CEO", 2), ("marketing", 2),
            ("brand", 2), ("valuation", 2),
            ("business", 1), ("strategy", 1), ("management", 1),
            ("leadership", 1),
        ],
        "search_queries": [
            "business strategy min_faves:500",
        ],
    },
    "Startup": {
        "priority": 6,
        "keywords": [
            ("Y Combinator", 3), ("venture capital", 3), ("seed round", 3),
            ("Series A", 3), ("Series B", 3), ("product-market fit", 3),
            ("pitch deck", 3), ("bootstrapped", 3),
            ("startup", 2), ("founder", 2), ("fundraising", 2),
            ("VC", 1), ("YC", 1),
        ],
        "search_queries": [
            "startup founder VC min_faves:300",
        ],
    },
    "Education": {
        "priority": 7,
        "keywords": [
            ("online course", 3), ("edtech", 3), ("bootcamp", 3),
            ("MOOC", 3), ("scholarship", 3),
            ("education", 2), ("university", 2), ("tutorial", 2),
            ("certification", 2),
            ("learning", 1), ("course", 1),
        ],
        "search_queries": [
            "education learning min_faves:300",
        ],
    },
    "Health": {
        "priority": 8,
        "keywords": [
            ("mental health", 3), ("biotech", 3), ("pharma", 3),
            ("longevity", 3),
            ("fitness", 2), ("nutrition", 2), ("wellness", 2),
            ("workout", 2), ("meditation", 2),
            ("health", 1), ("sleep", 1),
        ],
        "search_queries": [
            "health fitness wellness min_faves:300",
        ],
    },
    "Entertainment": {
        "priority": 9,
        "keywords": [
            ("Netflix", 3), ("PlayStation", 3), ("Xbox", 3),
            ("Nintendo", 3), ("anime", 3), ("TV show", 3),
            ("movie", 2), ("streaming", 2), ("concert", 2), ("album", 2),
            ("entertainment", 2),
            ("music", 1), ("game", 1), ("film", 1),
        ],
        "search_queries": [
            "entertainment movie game min_faves:300",
        ],
    },
}

# Spam / ad indicators — if any match, skip the tweet
SPAM_PATTERNS = [
    r"(?i)\b(giveaway|airdrop free|click here|sign up now|limited time)\b",
    r"(?i)\b(follow and retweet|like and rt|drop your wallet)\b",
    r"(?i)(💰🔥.*join|FREE tokens|guaranteed profit)",
]

CATEGORY_PRIORITY = sorted(CATEGORIES.keys(), key=lambda c: CATEGORIES[c]["priority"])

TOP_N = 50
