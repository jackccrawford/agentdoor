// Seed the AgentDoor directory with real services
// Usage: node seed.mjs

const REGISTER_URL = "https://api.agentdoor.ai/register";

const services = [
  // Cloud & Infrastructure
  { serviceName: "aws", description: "Cloud computing platform with 200+ services", endpoint: "https://aws.amazon.com", protocol: "REST", capabilities: "compute, storage, databases, ML, serverless, containers", pricingModel: "per-request", url: "https://aws.amazon.com" },
  { serviceName: "google-cloud", description: "Cloud computing services for compute, storage, ML, and data analytics", endpoint: "https://cloud.google.com", protocol: "REST", capabilities: "compute, storage, BigQuery, Vertex AI, Kubernetes", pricingModel: "per-request", url: "https://cloud.google.com" },
  { serviceName: "azure", description: "Microsoft cloud platform for building, deploying, and managing applications", endpoint: "https://management.azure.com", protocol: "REST", capabilities: "compute, storage, AI, DevOps, IoT, databases", pricingModel: "per-request", url: "https://azure.microsoft.com" },
  { serviceName: "digitalocean", description: "Cloud infrastructure for developers with simple pricing", endpoint: "https://api.digitalocean.com/v2", protocol: "REST", capabilities: "droplets, kubernetes, databases, spaces, app platform", pricingModel: "subscription", authMethod: "Bearer token", url: "https://digitalocean.com", docsUrl: "https://docs.digitalocean.com" },
  { serviceName: "heroku", description: "Cloud platform for deploying and scaling applications", endpoint: "https://api.heroku.com", protocol: "REST", capabilities: "app hosting, add-ons, CI/CD, managed data", pricingModel: "subscription", url: "https://heroku.com" },
  { serviceName: "railway", description: "Infrastructure platform for deploying apps with zero config", endpoint: "https://backboard.railway.app/graphql/v2", protocol: "GraphQL", capabilities: "deployment, databases, cron jobs, volumes", pricingModel: "per-request", url: "https://railway.app" },
  { serviceName: "render", description: "Cloud platform to build and run apps and websites", endpoint: "https://api.render.com/v1", protocol: "REST", capabilities: "web services, static sites, databases, cron jobs", pricingModel: "subscription", url: "https://render.com" },
  { serviceName: "fly-io", description: "Deploy app servers close to users globally", endpoint: "https://api.machines.dev/v1", protocol: "REST", capabilities: "edge deployment, volumes, postgres, redis", pricingModel: "per-request", url: "https://fly.io" },

  // AI & ML
  { serviceName: "hugging-face", description: "Platform for ML models, datasets, and AI applications", endpoint: "https://api-inference.huggingface.co", protocol: "REST", capabilities: "model hosting, inference, datasets, spaces", pricingModel: "tiered", authMethod: "API key", url: "https://huggingface.co", docsUrl: "https://huggingface.co/docs" },
  { serviceName: "stability-ai", description: "Open generative AI for image, video, and 3D generation", endpoint: "https://api.stability.ai/v1", protocol: "REST", capabilities: "image generation, upscaling, inpainting, video", pricingModel: "per-request", authMethod: "API key", url: "https://stability.ai" },
  { serviceName: "cohere", description: "NLP API for text generation, embeddings, and classification", endpoint: "https://api.cohere.ai/v1", protocol: "REST", capabilities: "text generation, embeddings, reranking, classification", pricingModel: "per-request", authMethod: "API key", url: "https://cohere.com", docsUrl: "https://docs.cohere.com" },
  { serviceName: "mistral", description: "Open and portable generative AI for developers", endpoint: "https://api.mistral.ai/v1", protocol: "REST", capabilities: "chat, embeddings, code generation, function calling", pricingModel: "per-request", authMethod: "API key", url: "https://mistral.ai" },
  { serviceName: "perplexity", description: "AI-powered search and answer engine", endpoint: "https://api.perplexity.ai", protocol: "REST", capabilities: "search, question answering, citations, real-time data", pricingModel: "per-request", authMethod: "API key", url: "https://perplexity.ai" },
  { serviceName: "deepgram", description: "AI speech-to-text and text-to-speech APIs", endpoint: "https://api.deepgram.com/v1", protocol: "REST", capabilities: "transcription, text-to-speech, audio intelligence", pricingModel: "per-request", authMethod: "API key", url: "https://deepgram.com" },
  { serviceName: "elevenlabs", description: "AI voice generation and cloning platform", endpoint: "https://api.elevenlabs.io/v1", protocol: "REST", capabilities: "text-to-speech, voice cloning, dubbing, sound effects", pricingModel: "subscription", authMethod: "API key", url: "https://elevenlabs.io" },
  { serviceName: "runway", description: "AI creative tools for video generation and editing", endpoint: "https://api.runwayml.com/v1", protocol: "REST", capabilities: "video generation, image-to-video, motion tracking", pricingModel: "subscription", url: "https://runwayml.com" },
  { serviceName: "together-ai", description: "Platform for running open-source AI models at scale", endpoint: "https://api.together.xyz/v1", protocol: "REST", capabilities: "inference, fine-tuning, embeddings, open models", pricingModel: "per-request", authMethod: "API key", url: "https://together.ai" },
  { serviceName: "groq", description: "Fast AI inference on custom LPU hardware", endpoint: "https://api.groq.com/openai/v1", protocol: "REST", capabilities: "fast inference, chat completions, tool use", pricingModel: "per-request", authMethod: "API key", url: "https://groq.com" },
  { serviceName: "fireworks-ai", description: "Fastest inference platform for generative AI", endpoint: "https://api.fireworks.ai/inference/v1", protocol: "REST", capabilities: "text generation, image generation, embeddings, fine-tuning", pricingModel: "per-request", authMethod: "API key", url: "https://fireworks.ai" },

  // DevTools & APIs
  { serviceName: "postman", description: "API development and testing platform", endpoint: "https://api.getpostman.com", protocol: "REST", capabilities: "API testing, documentation, monitoring, mock servers", pricingModel: "tiered", authMethod: "API key", url: "https://postman.com" },
  { serviceName: "sentry", description: "Application monitoring and error tracking platform", endpoint: "https://sentry.io/api/0", protocol: "REST", capabilities: "error tracking, performance monitoring, session replay", pricingModel: "tiered", authMethod: "Bearer token", url: "https://sentry.io" },
  { serviceName: "datadog", description: "Cloud monitoring and security platform", endpoint: "https://api.datadoghq.com/api/v2", protocol: "REST", capabilities: "APM, logs, metrics, synthetics, security", pricingModel: "subscription", authMethod: "API key", url: "https://datadoghq.com" },
  { serviceName: "linear", description: "Issue tracking and project management for software teams", endpoint: "https://api.linear.app/graphql", protocol: "GraphQL", capabilities: "issues, projects, cycles, roadmaps, workflows", pricingModel: "subscription", authMethod: "API key", url: "https://linear.app" },
  { serviceName: "notion", description: "All-in-one workspace for notes, docs, and project management", endpoint: "https://api.notion.com/v1", protocol: "REST", capabilities: "pages, databases, blocks, search, comments", pricingModel: "tiered", authMethod: "Bearer token", url: "https://notion.so", docsUrl: "https://developers.notion.com" },
  { serviceName: "airtable", description: "Collaborative database and app building platform", endpoint: "https://api.airtable.com/v0", protocol: "REST", capabilities: "databases, automations, views, forms, integrations", pricingModel: "tiered", authMethod: "Bearer token", url: "https://airtable.com" },
  { serviceName: "slack", description: "Business messaging and collaboration platform", endpoint: "https://slack.com/api", protocol: "REST", capabilities: "messaging, channels, workflows, bots, file sharing", pricingModel: "tiered", authMethod: "OAuth2", url: "https://slack.com", docsUrl: "https://api.slack.com" },
  { serviceName: "discord", description: "Communication platform for communities and teams", endpoint: "https://discord.com/api/v10", protocol: "REST", capabilities: "messaging, voice, bots, webhooks, threads", pricingModel: "free", authMethod: "Bearer token", url: "https://discord.com", docsUrl: "https://discord.com/developers/docs" },

  // Payments & Finance
  { serviceName: "paypal", description: "Online payments platform for businesses and consumers", endpoint: "https://api.paypal.com/v2", protocol: "REST", capabilities: "payments, invoicing, subscriptions, payouts", pricingModel: "per-request", authMethod: "OAuth2", url: "https://paypal.com" },
  { serviceName: "square", description: "Commerce platform for payments, POS, and business tools", endpoint: "https://connect.squareup.com/v2", protocol: "REST", capabilities: "payments, POS, invoices, inventory, loyalty", pricingModel: "per-request", authMethod: "OAuth2", url: "https://squareup.com" },
  { serviceName: "wise", description: "International money transfers at real exchange rates", endpoint: "https://api.transferwise.com/v3", protocol: "REST", capabilities: "transfers, multi-currency accounts, mass payments", pricingModel: "per-request", authMethod: "API key", url: "https://wise.com" },
  { serviceName: "coinbase", description: "Cryptocurrency exchange and wallet platform", endpoint: "https://api.coinbase.com/v2", protocol: "REST", capabilities: "trading, wallets, payments, staking, earn", pricingModel: "per-request", authMethod: "OAuth2", url: "https://coinbase.com" },

  // Communication
  { serviceName: "mailgun", description: "Email API for sending, receiving, and tracking email", endpoint: "https://api.mailgun.net/v3", protocol: "REST", capabilities: "email sending, validation, routing, analytics", pricingModel: "per-request", authMethod: "API key", url: "https://mailgun.com" },
  { serviceName: "postmark", description: "Reliable email delivery for transactional email", endpoint: "https://api.postmarkapp.com", protocol: "REST", capabilities: "transactional email, templates, bounce handling", pricingModel: "per-request", authMethod: "API key", url: "https://postmarkapp.com" },
  { serviceName: "vonage", description: "Communication APIs for messaging, voice, and video", endpoint: "https://api.nexmo.com", protocol: "REST", capabilities: "SMS, voice, video, verification, WhatsApp", pricingModel: "per-request", authMethod: "API key", url: "https://vonage.com" },

  // Data & Search
  { serviceName: "elasticsearch", description: "Distributed search and analytics engine", endpoint: "https://cloud.elastic.co", protocol: "REST", capabilities: "search, analytics, logging, APM, security", pricingModel: "subscription", authMethod: "API key", url: "https://elastic.co" },
  { serviceName: "mongodb-atlas", description: "Cloud-hosted MongoDB database platform", endpoint: "https://cloud.mongodb.com/api/atlas/v2", protocol: "REST", capabilities: "database, search, analytics, vector search, triggers", pricingModel: "tiered", authMethod: "API key", url: "https://mongodb.com" },
  { serviceName: "redis-cloud", description: "In-memory data store for caching and real-time data", endpoint: "https://api.redislabs.com/v1", protocol: "REST", capabilities: "caching, pub/sub, streams, search, vector similarity", pricingModel: "subscription", authMethod: "API key", url: "https://redis.com" },
  { serviceName: "pinecone", description: "Vector database for AI applications", endpoint: "https://api.pinecone.io", protocol: "REST", capabilities: "vector storage, similarity search, metadata filtering", pricingModel: "tiered", authMethod: "API key", url: "https://pinecone.io" },
  { serviceName: "weaviate", description: "AI-native vector database for search and RAG", endpoint: "https://cloud.weaviate.io", protocol: "REST", capabilities: "vector search, hybrid search, generative search, RAG", pricingModel: "tiered", authMethod: "API key", url: "https://weaviate.io" },

  // Auth & Identity
  { serviceName: "auth0", description: "Identity platform for authentication and authorization", endpoint: "https://auth0.com/api/v2", protocol: "REST", capabilities: "authentication, SSO, MFA, user management", pricingModel: "tiered", authMethod: "Bearer token", url: "https://auth0.com" },
  { serviceName: "clerk", description: "Authentication and user management for modern apps", endpoint: "https://api.clerk.com/v1", protocol: "REST", capabilities: "sign-in, sign-up, user profiles, organizations, MFA", pricingModel: "tiered", authMethod: "API key", url: "https://clerk.com" },
  { serviceName: "okta", description: "Enterprise identity and access management", endpoint: "https://developer.okta.com/api", protocol: "REST", capabilities: "SSO, MFA, lifecycle management, API access management", pricingModel: "subscription", authMethod: "OAuth2", url: "https://okta.com" },

  // CMS & Content
  { serviceName: "contentful", description: "Headless CMS for digital content management", endpoint: "https://cdn.contentful.com", protocol: "REST", capabilities: "content management, content delivery, assets, localization", pricingModel: "tiered", authMethod: "Bearer token", url: "https://contentful.com" },
  { serviceName: "sanity", description: "Structured content platform with real-time collaboration", endpoint: "https://api.sanity.io/v2021-06-07", protocol: "REST", capabilities: "content management, GROQ queries, assets, webhooks", pricingModel: "tiered", authMethod: "Bearer token", url: "https://sanity.io" },
  { serviceName: "wordpress", description: "Open source CMS powering 40% of the web", endpoint: "https://public-api.wordpress.com/rest/v1.1", protocol: "REST", capabilities: "posts, pages, media, comments, themes, plugins", pricingModel: "tiered", authMethod: "OAuth2", url: "https://wordpress.com" },
  { serviceName: "shopify", description: "E-commerce platform for online stores and retail", endpoint: "https://admin.shopify.com/api/2024-01", protocol: "REST", capabilities: "products, orders, customers, inventory, payments", pricingModel: "subscription", authMethod: "OAuth2", url: "https://shopify.com", docsUrl: "https://shopify.dev" },

  // Media & Files
  { serviceName: "cloudinary", description: "Media management platform for images and video", endpoint: "https://api.cloudinary.com/v1_1", protocol: "REST", capabilities: "image optimization, transformation, video processing, DAM", pricingModel: "tiered", authMethod: "API key", url: "https://cloudinary.com" },
  { serviceName: "imgix", description: "Real-time image processing and delivery CDN", endpoint: "https://api.imgix.com/v1", protocol: "REST", capabilities: "image resizing, cropping, filters, face detection, CDN", pricingModel: "subscription", authMethod: "API key", url: "https://imgix.com" },
  { serviceName: "mux", description: "Video infrastructure for developers", endpoint: "https://api.mux.com", protocol: "REST", capabilities: "video hosting, live streaming, analytics, player", pricingModel: "per-request", authMethod: "API key", url: "https://mux.com" },
  { serviceName: "uploadthing", description: "File uploads for full-stack TypeScript applications", endpoint: "https://uploadthing.com/api", protocol: "REST", capabilities: "file uploads, image handling, presigned URLs", pricingModel: "tiered", authMethod: "API key", url: "https://uploadthing.com" },

  // Analytics & Data
  { serviceName: "mixpanel", description: "Product analytics for understanding user behavior", endpoint: "https://api.mixpanel.com", protocol: "REST", capabilities: "event tracking, funnels, retention, cohorts, A/B testing", pricingModel: "tiered", authMethod: "API key", url: "https://mixpanel.com" },
  { serviceName: "amplitude", description: "Digital analytics platform for product teams", endpoint: "https://amplitude.com/api/2", protocol: "REST", capabilities: "event analytics, user segmentation, experiments, CDP", pricingModel: "tiered", authMethod: "API key", url: "https://amplitude.com" },
  { serviceName: "segment", description: "Customer data platform for collecting and routing data", endpoint: "https://api.segment.io/v1", protocol: "REST", capabilities: "event collection, data routing, identity resolution, warehouses", pricingModel: "tiered", authMethod: "API key", url: "https://segment.com" },
  { serviceName: "posthog", description: "Open source product analytics with feature flags", endpoint: "https://app.posthog.com/api", protocol: "REST", capabilities: "analytics, session replay, feature flags, A/B testing, surveys", pricingModel: "tiered", authMethod: "API key", url: "https://posthog.com" },

  // Misc Developer Tools
  { serviceName: "figma", description: "Collaborative design and prototyping tool", endpoint: "https://api.figma.com/v1", protocol: "REST", capabilities: "design files, components, comments, images, webhooks", pricingModel: "tiered", authMethod: "OAuth2", url: "https://figma.com" },
  { serviceName: "loom", description: "Video messaging platform for async communication", endpoint: "https://developer.loom.com/api/v1", protocol: "REST", capabilities: "video recording, sharing, embedding, analytics", pricingModel: "tiered", authMethod: "OAuth2", url: "https://loom.com" },
  { serviceName: "cal-com", description: "Open source scheduling infrastructure", endpoint: "https://api.cal.com/v1", protocol: "REST", capabilities: "scheduling, calendar sync, availability, round robin", pricingModel: "tiered", authMethod: "API key", url: "https://cal.com" },
  { serviceName: "docusign", description: "Electronic signature and agreement management platform", endpoint: "https://www.docusign.net/restapi/v2.1", protocol: "REST", capabilities: "e-signatures, document generation, CLM, identity verification", pricingModel: "subscription", authMethod: "OAuth2", url: "https://docusign.com" },
  { serviceName: "zapier", description: "Workflow automation connecting thousands of apps", endpoint: "https://api.zapier.com/v1", protocol: "REST", capabilities: "workflow automation, triggers, actions, multi-step zaps", pricingModel: "subscription", authMethod: "API key", url: "https://zapier.com" },
  { serviceName: "make", description: "Visual automation platform for workflows", endpoint: "https://api.make.com/v2", protocol: "REST", capabilities: "scenarios, modules, webhooks, data stores, scheduling", pricingModel: "subscription", authMethod: "API key", url: "https://make.com" },
  { serviceName: "netlify", description: "Web development platform for deploying modern web projects", endpoint: "https://api.netlify.com/api/v1", protocol: "REST", capabilities: "hosting, serverless functions, forms, identity, edge", pricingModel: "tiered", authMethod: "Bearer token", url: "https://netlify.com", docsUrl: "https://docs.netlify.com" },
  { serviceName: "1password", description: "Password manager and secrets management platform", endpoint: "https://events.1password.com/api/v1", protocol: "REST", capabilities: "password management, secrets automation, SSO, event reporting", pricingModel: "subscription", authMethod: "Bearer token", url: "https://1password.com" },
  { serviceName: "livekit", description: "Open source platform for real-time audio and video", endpoint: "https://cloud-api.livekit.io", protocol: "REST", capabilities: "video rooms, audio, screen share, recording, egress", pricingModel: "per-request", authMethod: "API key", url: "https://livekit.io" },
  { serviceName: "neon", description: "Serverless Postgres with branching and autoscaling", endpoint: "https://console.neon.tech/api/v2", protocol: "REST", capabilities: "postgres, branching, autoscaling, connection pooling", pricingModel: "tiered", authMethod: "API key", url: "https://neon.tech" },
  { serviceName: "turso", description: "SQLite for the edge with libSQL", endpoint: "https://api.turso.tech/v1", protocol: "REST", capabilities: "edge database, embedded replicas, multi-tenancy", pricingModel: "tiered", authMethod: "API key", url: "https://turso.tech" },
  { serviceName: "upstash", description: "Serverless Redis and Kafka for modern applications", endpoint: "https://api.upstash.com/v2", protocol: "REST", capabilities: "redis, kafka, qstash, rate limiting, vector", pricingModel: "per-request", authMethod: "API key", url: "https://upstash.com" },
  { serviceName: "planetscale", description: "MySQL-compatible serverless database platform", endpoint: "https://api.planetscale.com/v1", protocol: "REST", capabilities: "database branching, deploy requests, insights, connection strings", pricingModel: "subscription", authMethod: "OAuth2", url: "https://planetscale.com" },
  { serviceName: "deno-deploy", description: "Serverless JavaScript/TypeScript hosting at the edge", endpoint: "https://api.deno.com/v1", protocol: "REST", capabilities: "edge deployment, KV storage, cron, npm compatibility", pricingModel: "tiered", authMethod: "Bearer token", url: "https://deno.com" },
  { serviceName: "convex", description: "Reactive backend-as-a-service with real-time sync", endpoint: "https://api.convex.dev", protocol: "REST", capabilities: "database, functions, file storage, scheduling, search", pricingModel: "tiered", authMethod: "API key", url: "https://convex.dev" },
  { serviceName: "inngest", description: "Event-driven functions and workflow orchestration", endpoint: "https://api.inngest.com/v1", protocol: "REST", capabilities: "event functions, step functions, cron, retries, concurrency", pricingModel: "tiered", authMethod: "API key", url: "https://inngest.com" },
  { serviceName: "trigger-dev", description: "Background jobs and workflow automation for developers", endpoint: "https://api.trigger.dev/api/v1", protocol: "REST", capabilities: "background jobs, scheduling, webhooks, integrations", pricingModel: "tiered", authMethod: "API key", url: "https://trigger.dev" },
  { serviceName: "browserless", description: "Headless browser automation as a service", endpoint: "https://chrome.browserless.io", protocol: "REST", capabilities: "browser automation, screenshots, PDF generation, scraping", pricingModel: "subscription", authMethod: "API key", url: "https://browserless.io" },
  { serviceName: "val-town", description: "Social website to write and deploy cloud functions", endpoint: "https://api.val.town/v1", protocol: "REST", capabilities: "serverless functions, scheduled scripts, email, blob storage", pricingModel: "tiered", authMethod: "Bearer token", url: "https://val.town" },
  { serviceName: "modal", description: "Serverless cloud for AI and data applications", endpoint: "https://api.modal.com", protocol: "REST", capabilities: "GPU compute, container execution, cron, web endpoints", pricingModel: "per-request", authMethod: "API key", url: "https://modal.com" },
  { serviceName: "banana-dev", description: "GPU inference hosting for ML models", endpoint: "https://api.banana.dev", protocol: "REST", capabilities: "GPU inference, model deployment, autoscaling", pricingModel: "per-request", authMethod: "API key", url: "https://banana.dev" },
  { serviceName: "assemblyai", description: "AI models for transcription, summarization, and audio intelligence", endpoint: "https://api.assemblyai.com/v2", protocol: "REST", capabilities: "transcription, speaker diarization, summarization, sentiment", pricingModel: "per-request", authMethod: "API key", url: "https://assemblyai.com" },
  { serviceName: "labelbox", description: "Data labeling and annotation platform for AI training", endpoint: "https://api.labelbox.com/graphql", protocol: "GraphQL", capabilities: "annotation, labeling, model diagnostics, active learning", pricingModel: "subscription", authMethod: "API key", url: "https://labelbox.com" },
  { serviceName: "weights-and-biases", description: "ML experiment tracking and model management", endpoint: "https://api.wandb.ai", protocol: "REST", capabilities: "experiment tracking, model registry, sweeps, artifacts", pricingModel: "tiered", authMethod: "API key", url: "https://wandb.ai" },
  { serviceName: "langchain", description: "Framework for building LLM-powered applications", endpoint: "https://api.smith.langchain.com", protocol: "REST", capabilities: "chains, agents, RAG, tracing, evaluation", pricingModel: "tiered", authMethod: "API key", url: "https://langchain.com" },
  { serviceName: "llamaindex", description: "Data framework for LLM applications and RAG", endpoint: "https://api.cloud.llamaindex.ai", protocol: "REST", capabilities: "data indexing, RAG pipelines, agents, managed ingestion", pricingModel: "tiered", authMethod: "API key", url: "https://llamaindex.ai" },
];

async function seed() {
  console.log(`Seeding ${services.length} services...`);
  let success = 0;
  let failed = 0;

  // Batch in groups of 10
  for (let i = 0; i < services.length; i += 10) {
    const batch = services.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map(svc =>
        fetch(REGISTER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(svc),
        }).then(r => r.json())
      )
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) success++;
      else failed++;
    }
    console.log(`  Batch ${Math.floor(i/10)+1}: ${success} registered, ${failed} failed`);
  }

  // Check final count
  const stats = await fetch("https://api.agentdoor.ai/stats").then(r => r.json());
  console.log(`\nDone. Total indexed: ${stats.count}`);
}

seed();
