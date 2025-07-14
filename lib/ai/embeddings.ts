import OpenAI from 'openai'

// Lazy-initialize OpenAI client
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

// Cache for prototype embeddings
const prototypeEmbeddingsCache = new Map<string, number[]>()

// Generate embedding for text using OpenAI
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getOpenAIClient()
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // Limit text length
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('[Embeddings] Failed to generate embedding:', error)
    throw error
  }
}

// Compute cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)
  
  if (normA === 0 || normB === 0) {
    return 0
  }
  
  return dotProduct / (normA * normB)
}

// Comprehensive tag prototype definitions for semantic similarity
// Focused on specific subdomains and concepts rather than broad categories
export const TAG_PROTOTYPES = {
  // ===== PROGRAMMING LANGUAGES =====
  
  'python': "Python programming language development, data science libraries like pandas numpy scipy matplotlib, machine learning frameworks tensorflow pytorch, web frameworks django flask fastapi, package management with pip pypi, scientific computing, automation scripts, jupyter notebooks, data analysis workflows.",
  
  'javascript': "JavaScript programming language, modern web development, frontend frameworks react vue angular, backend development with nodejs express, package management npm yarn, typescript transpilation, asynchronous programming, dom manipulation, web apis, single page applications, progressive web apps.",
  
  'typescript': "TypeScript programming language, static type checking for javascript, microsoft development, type definitions, compiled javascript, large application development, ide support, interface definitions, generic programming, strict typing, modern javascript features with types.",
  
  'rust': "Rust programming language, systems programming, memory safety, zero-cost abstractions, cargo package manager, webassembly compilation, performance-critical applications, concurrent programming, ownership model, safe systems programming.",
  
  'go': "Go programming language, golang development, google created language, concurrent programming, microservices architecture, cloud native applications, simple syntax, fast compilation, garbage collection, networking applications, distributed systems.",
  
  // ===== WEB FRAMEWORKS & FRONTEND =====
  
  'react': "React javascript library, user interface development, component-based architecture, jsx syntax, virtual dom, react hooks, state management, frontend development, single page applications, nextjs framework, create react app, declarative programming.",
  
  'vue': "Vue.js javascript framework, progressive web framework, component-based development, vue cli, nuxt.js, reactive data binding, single file components, easy learning curve, template syntax, vue router, vuex state management.",
  
  'angular': "Angular framework, typescript-based web framework, google development, component architecture, dependency injection, cli tools, reactive programming, rxjs, single page applications, enterprise applications, material design.",
  
  'web-development': "Web development, frontend development, backend development, full-stack development, responsive design, web applications, user experience, web technologies, modern web development, web frameworks.",
  
  'mobile-development': "Mobile development, ios development, android development, mobile applications, app development, react native, flutter, mobile user interface, mobile platforms, cross-platform development.",
  
  // ===== AI/ML FRAMEWORKS & TECHNIQUES =====
  
  'tensorflow': "TensorFlow machine learning framework, deep learning, neural networks, keras high-level api, google development, model training, gpu acceleration, tensorboard visualization, serving models, tensorflow lite, research and production.",
  
  'pytorch': "PyTorch deep learning framework, dynamic computation graphs, research-friendly, facebook development, neural network training, gpu acceleration, autograd automatic differentiation, torchvision, model deployment, scientific computing.",
  
  'llms': "Large language models, GPT models, transformer-based language models, text generation, language understanding, prompt engineering, fine-tuning, instruction following, chat models, language model training, emergent capabilities, scaling laws.",
  
  'agents': "AI agents, autonomous agents, intelligent agents, multi-agent systems, agent frameworks, tool-using agents, reasoning agents, planning agents, agentic workflows, agent orchestration, langchain agents, agent-based modeling.",
  
  'multimodal': "Multimodal AI, vision-language models, image-text understanding, multimodal learning, cross-modal reasoning, vision transformers, CLIP models, text-to-image generation, image captioning, visual question answering, multimodal fusion.",
  
  'transformers': "Transformer architecture, attention mechanism, self-attention, bert, gpt models, large language models, sequence-to-sequence learning, natural language processing, machine translation, text generation, pre-trained models.",
  
  'deep-learning': "Deep learning neural networks, backpropagation, gradient descent, convolutional neural networks, recurrent neural networks, deep architectures, representation learning, feature extraction, end-to-end learning, neural network training.",
  
  'machine-learning': "Machine learning algorithms, supervised learning, unsupervised learning, model training, feature engineering, cross-validation, overfitting, bias-variance tradeoff, ensemble methods, model evaluation, predictive modeling, statistical learning.",
  
  'computer-vision': "Computer vision, image recognition, object detection, image classification, convolutional neural networks, opencv, image processing, pattern recognition, facial recognition, medical imaging, autonomous vehicles vision.",
  
  'natural-language-processing': "Natural language processing, text analysis, language models, sentiment analysis, named entity recognition, machine translation, text classification, information extraction, computational linguistics, speech recognition, language understanding.",
  
  'reinforcement-learning': "Reinforcement learning, reward-based learning, policy gradient methods, q-learning, deep reinforcement learning, markov decision processes, agent-environment interaction, exploration vs exploitation, game playing, robotics control.",
  
  'neural-networks': "Neural networks, artificial neurons, multilayer perceptrons, activation functions, backpropagation training, network architectures, deep neural networks, feedforward networks, weight optimization, network topology.",
  
  'robotics': "Robotics systems, robot manipulation, navigation, sensor fusion, control systems, autonomous robots, robot operating system ros, motion planning, computer vision for robotics, human-robot interaction, industrial automation.",
  
  // ===== INFRASTRUCTURE & SYSTEMS =====
  
  'docker': "Docker containerization platform, application containers, dockerfile, docker compose, microservices architecture, development environment consistency, container orchestration, image management, devops workflows, deployment automation.",
  
  'kubernetes': "Kubernetes container orchestration, k8s cluster management, pod scheduling, service discovery, load balancing, scaling applications, cloud native deployment, helm charts, kubectl commands, container management at scale.",
  
  'aws': "Amazon Web Services cloud platform, ec2 instances, s3 storage, lambda serverless, rds databases, vpc networking, iam security, cloudformation infrastructure as code, elastic load balancing, auto scaling, big data analytics.",
  
  'azure': "Microsoft Azure cloud platform, virtual machines, azure storage, azure functions, azure sql, active directory, resource groups, arm templates, azure devops, power platform integration, hybrid cloud solutions.",
  
  'gcp': "Google Cloud Platform, compute engine, cloud storage, bigquery analytics, cloud functions, kubernetes engine, cloud sql, dataflow, cloud ai platform, firebase, serverless computing, data engineering.",
  
  'cloud-computing': "Cloud computing, distributed computing, serverless computing, microservices architecture, cloud platforms, cloud migration, cloud native applications, hybrid cloud, multi-cloud strategies, cloud services.",
  
  'system-design': "System design, distributed systems architecture, scalability patterns, load balancing, caching strategies, database sharding, microservices design, system architecture, high availability, fault tolerance, system optimization.",
  
  'distributed-systems': "Distributed systems, distributed computing, consensus algorithms, CAP theorem, eventual consistency, distributed databases, message queues, service mesh, distributed transactions, fault tolerance, system reliability.",
  
  'devops': "DevOps practices, continuous integration, continuous deployment, infrastructure automation, monitoring, deployment pipelines, site reliability engineering, configuration management, infrastructure as code, system administration.",
  
  // ===== DATA & ANALYTICS =====
  
  'database': "Database systems, relational databases, sql queries, postgresql mysql, database design, query optimization, indexing, transactions, data modeling, nosql databases, mongodb redis, data warehousing, database administration.",
  
  'data-engineering': "Data engineering, ETL pipelines, data warehousing, data lakes, data processing, stream processing, batch processing, data pipeline orchestration, data quality, data governance, modern data stack.",
  
  'spark': "Apache Spark distributed computing, big data processing, pyspark python api, dataframes, rdd resilient distributed datasets, spark sql, streaming data, machine learning mllib, databricks platform, cluster computing.",
  
  'hadoop': "Apache Hadoop distributed storage, mapreduce programming model, hdfs filesystem, big data processing, yarn resource manager, hive data warehouse, pig scripting, ecosystem tools, data lakes, batch processing.",
  
  'dbt': "dbt data build tool, analytics engineering, sql transformations, data modeling, data warehouse transformation, version control, testing, documentation, lineage tracking, modern data stack, dbt labs.",
  
  'snowflake': "Snowflake cloud data platform, data warehouse, sql analytics, data sharing, elastic scaling, zero-copy cloning, time travel, data governance, cloud native architecture, separated compute and storage.",
  
  'data-science': "Data science, analytics, statistical analysis, data visualization, exploratory data analysis, data mining, predictive analytics, business intelligence, data-driven decision making, statistical modeling, data insights.",
  
  // ===== DEVELOPMENT TOOLS & APIS =====
  
  'api': "API development, rest apis, graphql, endpoint design, authentication, rate limiting, api versioning, documentation, swagger openapi, api gateway, microservices communication, json responses, http methods.",
  
  'graphql': "GraphQL query language, flexible api queries, type system, single endpoint, apollo client server, relay, schema definition, resolvers, real-time subscriptions, efficient data fetching, strongly typed apis.",
  
  'github': "GitHub version control, git repositories, pull requests, issue tracking, collaborative development, open source hosting, actions ci/cd, pages static hosting, organizations, code review, project management.",
  
  // ===== SPECIALIZED DOMAINS =====
  
  'security': "Cybersecurity, information security, encryption, authentication, vulnerability assessment, threat detection, security architecture, data protection, network security, application security, security best practices.",
  
  'privacy': "Privacy protection, data privacy, gdpr compliance, personal data protection, privacy by design, consent management, data governance, privacy regulations, user privacy, data anonymization.",
  
  'performance': "Performance optimization, system performance, application performance, scalability, latency reduction, throughput optimization, performance monitoring, load testing, performance tuning, efficiency improvements.",
  
  'blockchain': "Blockchain technology, cryptocurrency, distributed ledger, smart contracts, decentralized applications, bitcoin, ethereum, web3, defi decentralized finance, crypto trading, blockchain development.",
  
  'healthcare': "Healthcare technology, medical technology, clinical applications, patient care, medical diagnosis, treatment planning, healthcare informatics, telemedicine, medical devices, digital health, healthcare systems.",
  
  'finance': "Financial technology, fintech, banking technology, financial services, trading systems, risk management, payment systems, financial analytics, investment technology, financial modeling, digital banking.",
  
  'energy': "Energy technology, renewable energy, solar power, wind energy, energy storage, battery technology, smart grid, energy efficiency, sustainable energy, power systems, energy management.",
  
  'manufacturing': "Manufacturing technology, industrial automation, production systems, quality control, smart manufacturing, industry 4.0, manufacturing processes, supply chain, lean manufacturing, production optimization.",
  
  'education': "Educational technology, online learning, e-learning platforms, digital education, learning management systems, educational software, academic technology, teaching tools, educational innovation, learning analytics.",
  
  'agriculture': "Agricultural technology, precision agriculture, farming technology, crop monitoring, agricultural automation, food security, sustainable agriculture, agtech, smart farming, agricultural innovation.",
  
  'telecommunications': "Telecommunications technology, networking, wireless communication, 5g networks, network infrastructure, communication protocols, mobile networks, internet connectivity, network optimization.",
  
  // ===== SPECIFIC SCIENCES =====
  
  'biomedical-engineering': "Biomedical engineering, medical devices, biomedical signal processing, medical imaging, prosthetics, biomaterials, tissue engineering, biomedical instrumentation, healthcare technology, medical diagnostics.",
  
  'materials-science': "Materials science and engineering, nanotechnology, material properties, semiconductor materials, polymers, composites, material characterization, crystal structures, electronic materials, sustainable materials.",
  
  'climate-science': "Climate science, environmental sustainability, carbon footprint, renewable energy, climate change mitigation, environmental monitoring, green technology, sustainable development, climate modeling, carbon capture.",
  
  'physics': "Physics research, quantum mechanics, quantum computing, photonics, optics, electromagnetic theory, condensed matter physics, particle physics, theoretical physics, experimental physics, quantum systems.",
  
  'chemistry': "Chemistry research, chemical engineering, catalysis, organic chemistry, inorganic chemistry, analytical chemistry, material synthesis, chemical processes, molecular chemistry, chemical reactions.",
  
  'biology': "Biology research, molecular biology, genetics, genomics, bioinformatics, biotechnology, cell biology, proteomics, systems biology, computational biology, life sciences, biological systems.",
  
  'neuroscience': "Neuroscience research, brain science, neural systems, cognitive neuroscience, computational neuroscience, neuroimaging, brain computer interfaces, neural networks biological, neurological disorders, brain function.",
  
  'mathematics': "Mathematics research, mathematical modeling, optimization algorithms, statistics, probability theory, mathematical analysis, applied mathematics, computational mathematics, numerical methods, mathematical foundations.",
  
  // ===== CONTENT TYPES =====
  
  'tutorial': "Tutorial content, how-to guides, step-by-step instructions, educational walkthrough, hands-on learning, practical examples, coding tutorials, instructional content, learning resources, training materials.",
  
  'announcement': "Product announcements, new releases, feature launches, version updates, company news, product updates, breaking news, official announcements, release notes, launch events.",
  
  'research': "Research papers, academic research, scientific studies, research findings, experimental results, peer-reviewed research, research methodology, literature review, empirical studies, research publications.",
  
  'news': "Technology news, industry news, breaking news, current events, tech journalism, news updates, market news, business news, industry developments, news coverage.",
  
  'review': "Product reviews, technology reviews, comparative analysis, benchmarking, evaluation, assessment, performance review, feature comparison, critical analysis, expert reviews.",
  
  'documentation': "Technical documentation, api documentation, user guides, reference materials, software documentation, system documentation, developer documentation, specifications, manuals.",
  
  'case-study': "Case studies, real-world examples, practical applications, success stories, implementation examples, use cases, business cases, application scenarios, project examples.",
  
  'opinion': "Opinion pieces, editorial content, thought leadership, expert opinions, commentary, analysis, perspectives, insights, professional opinions, industry views.",
  
  'interview': "Interviews, conversations, q&a sessions, expert interviews, leadership interviews, technical discussions, podcast interviews, executive interviews, developer interviews.",
  
  // ===== COMPANIES & ORGANIZATIONS =====
  
  'openai': "OpenAI company, chatgpt, gpt models, dall-e, whisper, ai safety research, large language models, artificial general intelligence, ai alignment, responsible ai development.",
  
  'microsoft': "Microsoft corporation, windows, office suite, azure cloud, power platform, power bi, excel, teams, microsoft ai, copilot, microsoft 365, enterprise software.",
  
  'google': "Google company, search engine, android, chrome, google cloud, tensorflow, google ai, alphabet, youtube, google workspace, google research, deepmind.",
  
  'meta': "Meta company, facebook, instagram, whatsapp, virtual reality, augmented reality, metaverse, social media platforms, meta ai, llama models, reality labs.",
  
  'amazon': "Amazon company, e-commerce, amazon web services aws, alexa, prime, cloud computing, marketplace, logistics, amazon ai, machine learning services.",
  
  'apple': "Apple company, iphone, ipad, mac, ios, macos, app store, apple silicon, apple intelligence, mobile technology, consumer electronics, apple ecosystem.",
  
  'nvidia': "Nvidia company, gpu graphics cards, cuda computing, deep learning hardware, ai acceleration, gaming graphics, data center, autonomous vehicles, ai chips.",
  
  'anthropic': "Anthropic ai company, claude ai assistant, ai safety research, constitutional ai, harmless ai, ai alignment, responsible ai development, large language models.",
  
  'databricks': "Databricks company, unified analytics platform, apache spark, delta lake, machine learning platform, data lakehouse, collaborative analytics, data engineering.",
  
  'huggingface': "Hugging face company, transformers library, model hub, natural language processing, open source ai, machine learning models, ai community, democratizing ai.",
  
  'mit': "Massachusetts institute of technology, mit research, computer science, artificial intelligence, technology innovation, academic research, mit csail, mit media lab.",
  
  'stanford': "Stanford university, computer science research, ai research, machine learning, stanford ai lab, academic research, technology innovation, silicon valley.",
  
  'harvard': "Harvard university, harvard business school, business research, management studies, technology strategy, academic research, business innovation, leadership studies.",
  
  // ===== OUTCOMES & CONCEPTS =====
  
  'breakthrough': "Breakthrough research, scientific breakthroughs, innovation, groundbreaking discoveries, revolutionary technology, paradigm shifts, major advances, cutting-edge research, game-changing developments.",
  
  'improvement': "Performance improvements, optimization, enhancements, efficiency gains, better performance, upgrades, refinements, incremental improvements, quality improvements, system enhancements.",
  
  'discovery': "Scientific discoveries, research findings, new insights, revelations, breakthrough findings, novel discoveries, research breakthroughs, innovative solutions, new understanding.",
  
  'validation': "Validation studies, verification, proof of concept, experimental validation, results confirmation, evidence-based findings, testing validation, scientific proof, research validation.",
  
  'collaboration': "Research collaboration, interdisciplinary research, team collaboration, academic partnerships, industry collaboration, joint research, cooperative projects, collaborative innovation.",
  
  'publication': "Research publications, academic papers, journal articles, conference proceedings, scientific publications, peer-reviewed papers, research dissemination, scholarly communication.",
  
  'open-source': "Open source software, oss community, free software, community development, collaborative development, open source projects, mit license, apache license, github repositories.",
  
  'startup': "Startup companies, entrepreneurship, venture capital, seed funding, series a funding, unicorn companies, startup ecosystem, innovation, business development, y combinator.",
  
  'enterprise': "Enterprise software, business applications, corporate technology, enterprise solutions, b2b software, business intelligence, enterprise architecture, corporate systems.",
  
  'sustainability': "Sustainability initiatives, green technology, environmental sustainability, carbon neutral, renewable energy, sustainable development, eco-friendly technology, climate solutions.",
  
  // ===== EVENTS & CONFERENCES =====
  
  'conference': "Technology conferences, academic conferences, industry events, tech summits, research conferences, professional conferences, conference presentations, networking events.",
  
  'hackathon': "Hackathons, coding competitions, innovation challenges, developer events, hackathon projects, collaborative coding, rapid prototyping, competitive programming.",
  
  'award': "Technology awards, innovation awards, research awards, industry recognition, competition winners, achievement recognition, excellence awards, prestigious honors."
}

// Initialize prototype embeddings (call once at startup)
export async function initializePrototypeEmbeddings(): Promise<void> {
  console.log('[Embeddings] Initializing comprehensive prototype embeddings...')
  
  const startTime = Date.now()
  const promises: Promise<void>[] = []
  
  for (const [tag, description] of Object.entries(TAG_PROTOTYPES)) {
    promises.push(
      generateEmbedding(description).then(embedding => {
        prototypeEmbeddingsCache.set(tag, embedding)
      })
    )
  }
  
  await Promise.all(promises)
  
  const duration = Date.now() - startTime
  console.log(`[Embeddings] Initialized ${prototypeEmbeddingsCache.size} prototype embeddings in ${duration}ms`)
  console.log(`[Embeddings] Coverage: ${Object.keys(TAG_PROTOTYPES).length} comprehensive prototypes`)
}

// Get semantic tags for content based on embedding similarity
export async function getSemanticTags(
  content: string,
  threshold: number = 0.7,
  maxTags: number = 5
): Promise<{ tag: string; similarity: number }[]> {
  // Generate embedding for content
  const contentEmbedding = await generateEmbedding(content)
  
  // Compute similarities to all prototypes
  const similarities: { tag: string; similarity: number }[] = []
  
  for (const [tag, prototypeEmbedding] of prototypeEmbeddingsCache.entries()) {
    const similarity = cosineSimilarity(contentEmbedding, prototypeEmbedding)
    if (similarity >= threshold) {
      similarities.push({ tag, similarity })
    }
  }
  
  // Sort by similarity and return top K
  similarities.sort((a, b) => b.similarity - a.similarity)
  return similarities.slice(0, maxTags)
}

// Get prototype embedding for a specific tag
export function getPrototypeEmbedding(tag: string): number[] | undefined {
  return prototypeEmbeddingsCache.get(tag)
} 