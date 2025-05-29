import Link from "next/link";

export default function HomePage() {
    return (
        <main className="flex flex-col items-center justify-center h-screen px-4 text-center space-y-6 bg-background text-black dark:bg-background dark:text-white transition-colors duration-300">
            <div>
                <h1 className="text-3xl font-bold font-[family-name:var(--font-geist-sans)]">
                    LeaChain
                </h1>
                <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                    임대차계약 중개 플랫폼 (BETA)
                </p>
            </div>

            <div className="w-full max-w-xs space-y-3">
                <Link href="/signup">
                    <button className="btn-primary mt-2 pb-2">회원가입</button>
                </Link>

                <Link href="/login">
                    <button className="btn-secondary mt-2 pb-2">로그인</button>
                </Link>

                <Link href="/audit">
                    <p className="text-xs text-gray-500 dark:text-gray-400 hover:underline mt-4 pb-2">
                        감사로그 인증센터
                    </p>
                </Link>
            </div>
        </main>
    );
}
