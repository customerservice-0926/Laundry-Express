"use client";

import * as React from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
  onStepClick: (stepNum: number) => void;
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="mb-6 sm:mb-8 w-full">
      {/* Mobile View: High-contrast compact stepper */}
      <div className="sm:hidden bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider bg-pink-100 text-primary px-2.5 py-0.5 rounded-full shrink-0">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-xs font-bold text-slate-900 truncate">
              {steps[currentStep - 1]}
            </span>
          </div>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => onStepClick(currentStep - 1)}
              className="text-[11px] font-semibold text-slate-500 hover:text-primary flex items-center gap-0.5 shrink-0 ml-2 cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
          )}
        </div>

        {/* 6-segment interactive bar (Never wraps, never overflows) */}
        <div className="grid grid-cols-6 gap-1.5 w-full">
          {steps.map((label, i) => {
            const num = i + 1;
            const isDone = currentStep > num;
            const isActive = currentStep === num;
            return (
              <button
                key={label}
                type="button"
                disabled={num >= currentStep}
                onClick={() => num < currentStep && onStepClick(num)}
                title={`Step ${num}: ${label}`}
                className={cn(
                  "h-2 rounded-full transition-all w-full",
                  isDone
                    ? "bg-primary cursor-pointer hover:opacity-80"
                    : isActive
                    ? "bg-primary ring-2 ring-primary/30"
                    : "bg-slate-200 cursor-default"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Desktop / Tablet View: Full progress bar with numbered circles */}
      <div className="hidden sm:block bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center w-full justify-between">
          {steps.map((label, i) => {
            const num = i + 1;
            const done = currentStep > num;
            const active = currentStep === num;
            return (
              <React.Fragment key={label}>
                <button
                  type="button"
                  onClick={() => num < currentStep && onStepClick(num)}
                  title={label}
                  className={cn(
                    "flex flex-col items-center gap-1.5 shrink-0 transition-all max-w-21 md:max-w-25",
                    num < currentStep ? "cursor-pointer group" : "cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all",
                      done
                        ? "border-primary bg-primary text-white"
                        : active
                        ? "border-primary bg-white text-primary shadow-sm ring-4 ring-primary/10"
                        : "border-slate-200 bg-slate-50 text-slate-400"
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : num}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-bold text-center leading-tight transition-colors line-clamp-2",
                      active ? "text-primary" : done ? "text-slate-700 group-hover:text-primary" : "text-slate-400"
                    )}
                  >
                    {label}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 transition-all mx-1.5 sm:mx-2 self-start mt-4",
                      currentStep > i + 1 ? "bg-primary" : "bg-slate-200"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
