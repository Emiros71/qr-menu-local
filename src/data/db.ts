export type TranslationData = {
    name?: string;
    description?: string;
};

export type Theme = {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    defaultProductImage?: string;
    headerColor?: string;
    labelColor?: string;
    cardColor?: string;
    cardStyle?: 'modern' | 'minimal' | 'glass' | 'bordered';
};

export type Category = {
    id: string;
    name: string;
    image?: string;
    coverImage?: string;
    translations?: Record<string, TranslationData>;
};

export type Product = {
    id: string;
    categoryId: string;
    venueId?: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    image?: string;
    labels?: string[];
    isAvailable: boolean;
    allergens?: string[]; // e.g. ['Gluten', 'Dairy']
    isChefRecommendation?: boolean;
    calories?: number;
    translations?: Record<string, TranslationData>;
};

export type Allergen = {
    id: string;
    name: string;
    translations?: Record<string, { name: string }>;
};

export type Venue = {
    id: string;
    slug: string; // e.g., "aura", "one-bar"
    name: string;
    description?: string;
    logo?: string; // URL
    coverImage?: string; // URL
    theme: Theme;
    categories: Category[];
    products: Product[];
    allergens?: Allergen[];
    supportedLanguages?: string[];
    defaultLanguage?: string;
};

export const venues: Venue[] = [
    {
        id: "v_aura",
        slug: "aura",
        name: "Aura Restaurant",
        description: "Özel lezzetlerimizi keşfedin.",
        coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2670&auto=format&fit=crop",
        theme: {
            primary: "#860B5B", // Crowne Plum
            secondary: "#C5A065", // Gold
            background: "#FAFAF9", // Stone 50
            foreground: "#1C1917", // Stone 900
        },
        supportedLanguages: ['tr', 'en'],
        defaultLanguage: 'tr',
        categories: [
            { id: "c_aura_1", name: "Ana Yemekler", image: "https://images.unsplash.com/photo-1546241072-48010ad2862c?q=80&w=2574&auto=format&fit=crop" },
            { id: "c_aura_2", name: "İçecekler", image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=2574&auto=format&fit=crop" },
        ],
        products: [
            {
                id: "p_aura_1",
                categoryId: "c_aura_1",
                name: "Izgara Antrikot",
                description: "250g dinlendirilmiş antrikot, patates püresi.",
                price: 950,
                currency: "₺",
                image: "https://images.unsplash.com/photo-1546241072-48010ad2862c?q=80&w=2574&auto=format&fit=crop",
                isAvailable: true,
                labels: ["Şefin Tavsiyesi"]
            },
            {
                id: "p_aura_2",
                categoryId: "c_aura_2",
                name: "Signature Cocktail",
                description: "Aura özel karışımı.",
                price: 450,
                currency: "₺",
                image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=2574&auto=format&fit=crop",
                isAvailable: true,
            }
        ]
    },
    {
        id: "v_onebar",
        slug: "one-bar",
        name: "One Bar",
        description: "Exclusive drinks & music.",
        coverImage: "https://images.unsplash.com/photo-1574096079513-d8259312b785?q=80&w=2670&auto=format&fit=crop",
        theme: {
            primary: "#2563EB", // Electric Blue
            secondary: "#A855F7", // Purple Accent
            background: "#09090b", // Dark
            foreground: "#FAFAF9", // Light text
        },
        categories: [
            { id: "c_one_1", name: "Kokteyller", image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2670&auto=format&fit=crop" },
            { id: "c_one_2", name: "Atıştırmalıklar", image: "https://images.unsplash.com/photo-1529193591176-1dae03804856?q=80&w=2670&auto=format&fit=crop" },
        ],
        products: [
            {
                id: "p_one_1",
                categoryId: "c_one_1",
                name: "Negroni",
                description: "Gin, Vermouth Rosso, Campari.",
                price: 380,
                currency: "₺",
                image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2670&auto=format&fit=crop",
                isAvailable: true,
            },
            {
                id: "p_one_2",
                categoryId: "c_one_2",
                name: "Tapas Tabağı",
                description: "Karışık İspanyol atıştırmalıkları.",
                price: 420,
                currency: "₺",
                image: "https://images.unsplash.com/photo-1621537272827-023a7be2904d?q=80&w=2670&auto=format&fit=crop",
                isAvailable: true,
            }
        ]
    },
    {
        id: "v_cafe_ankara",
        slug: "the-cafe-ankara",
        name: "The Cafe Ankara",
        description: "Taze kahve ve günlük tatlılar.",
        coverImage: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2671&auto=format&fit=crop",
        theme: {
            primary: "#EA580C", // Warm Orange
            secondary: "#78350F", // Brown
            background: "#FFF7ED", // Cream
            foreground: "#431407", // Dark Brown
        },
        categories: [
            { id: "c_cafe_1", name: "Kahveler", image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2671&auto=format&fit=crop" },
            { id: "c_cafe_2", name: "Tatlılar", image: "https://images.unsplash.com/photo-1551024601-564d6e67e252?q=80&w=2574&auto=format&fit=crop" },
        ],
        products: [
            {
                id: "p_cafe_1",
                categoryId: "c_cafe_1",
                name: "Latte",
                description: "Espresso ve buharda ısıtılmış süt.",
                price: 120,
                currency: "₺",
                image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=2669&auto=format&fit=crop",
                isAvailable: true,
            },
            {
                id: "p_cafe_2",
                categoryId: "c_cafe_2",
                name: "San Sebastian",
                description: "Akışkan kıvamlı cheesecake.",
                price: 180,
                currency: "₺",
                image: "https://images.unsplash.com/photo-1551024601-564d6e67e252?q=80&w=2574&auto=format&fit=crop",
                isAvailable: true,
            }
        ]
    }
];
