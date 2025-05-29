"use client";

import { useState } from "react";

interface Step1Props {
    onNext: () => void;
}

export default function Step1({ onNext }: Step1Props) {
    const [subStep, setSubStep] = useState<1 | 2>(1);

    return (
        <div className="space-y-4">
            {subStep === 1 && (
                <>
                    <div>
                        <label className="block text-sm mb-1">이름</label>
                        <input type="text" className="input-field px-3 py-2" />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">전화번호</label>
                        <input
                            type="tel"
                            placeholder="- 없이 숫자만 입력"
                            className="input-field px-3 py-2 "
                        />
                    </div>

                    <button
                        onClick={() => setSubStep(2)}
                        className="btn-primary mt-4 cursor-pointer"
                    >
                        인증번호 발송
                    </button>
                </>
            )}

            {subStep === 2 && (
                <>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            placeholder="000000"
                            className="flex-3 input-field px-3 py-2"
                        />
                        <button className="flex-1 btn-secondary px-3 py-2 cursor-pointer">
                            재발송
                        </button>
                    </div>

                    <button
                        onClick={onNext}
                        className="btn-primary py-2 mt-4 cursor-pointer"
                    >
                        인증
                    </button>
                </>
            )}
        </div>
    );
}
