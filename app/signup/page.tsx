"use client";

import { useState } from "react";
import Step1 from "./components/step1";

export default function SignupPage() {
    const [step, setStep] = useState(1);

    return (
        <main className="flex items-center justify-center h-screen bg-white dark:bg-background text-black dark:text-white px-4">
            <div className="w-full max-w-sm border border-gray-300 dark:border-gray-700 p-6 bg-white dark:bg-black space-y-6 rounded shadow">
                <h2 className="text-lg font-bold">본인 인증</h2>

                <div className="flex justify-between items-center">
                    {[1, 2, 3, 4].map((n) => (
                        <div
                            key={n}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-[family-name:var(--font-geist-sans)] ${
                                n === step
                                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                                    : "border-gray-400 text-gray-400"
                            }`}
                        >
                            {n}
                        </div>
                    ))}
                </div>

                {step === 1 && <Step1 onNext={() => setStep(2)} />}
            </div>
        </main>
    );
}
