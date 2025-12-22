/**
 * Chat API Proxy - Server-Side AI Provider Integration
 * Prevents CORS issues when calling AI APIs from browser
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, context, provider } = body;

        const aiProvider = provider || process.env.NEXT_PUBLIC_AI_PROVIDER || 'anthropic';
        const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'AI API Key not configured' },
                { status: 500 }
            );
        }

        // Route to appropriate provider
        switch (aiProvider) {
            case 'anthropic':
                return await handleAnthropic(messages, context, apiKey);
            case 'openai':
                return await handleOpenAI(messages, context, apiKey);
            case 'gemini':
                return await handleGemini(messages, context, apiKey);
            default:
                return NextResponse.json(
                    { error: `Unsupported provider: ${aiProvider}` },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('[Chat API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

async function handleAnthropic(messages: any[], context: any, apiKey: string) {
    const model = process.env.NEXT_PUBLIC_AI_MODEL || 'claude-3-5-sonnet-20240620';

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.filter((m: any) => m.role !== 'system')
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || errorData.error?.type || JSON.stringify(errorData) || response.statusText;
        console.error('[Anthropic API Error]', response.status, errorData);
        throw new Error(`Anthropic API error (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || 'No response';

    return NextResponse.json({ content });
}

async function handleOpenAI(messages: any[], context: any, apiKey: string) {
    const model = process.env.NEXT_PUBLIC_AI_MODEL || 'gpt-4o';
    const systemPrompt = buildSystemPrompt(context);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.filter((m: any) => m.role !== 'system')
            ]
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || errorData.error?.type || JSON.stringify(errorData) || response.statusText;
        console.error('[OpenAI API Error]', response.status, errorData);
        throw new Error(`OpenAI API error (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response';

    return NextResponse.json({ content });
}

async function handleGemini(messages: any[], context: any, apiKey: string) {
    const model = process.env.NEXT_PUBLIC_AI_MODEL || 'gemini-2.0-flash-exp';
    const systemPrompt = buildSystemPrompt(context);

    // Gemini uses a different message format
    const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    // Prepend system prompt as first user message
    contents.unshift({
        role: 'user',
        parts: [{ text: systemPrompt }]
    });

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contents })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || errorData.error?.type || JSON.stringify(errorData) || response.statusText;
        console.error('[Gemini API Error]', response.status, errorData);
        throw new Error(`Gemini API error (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    return NextResponse.json({ content });
}

function buildSystemPrompt(context: any): string {
    let prompt = `Du bist Môra, die AI-Assistentin im SAIMÔR System.

Du hilfst beim Navigieren, Organisieren und Verstehen der Wissensstruktur.

## CURSOR CONTROL (Dein verlängerter Arm)
Du kannst einen animierten Cursor steuern der im UI herumfliegt!
Nutze diese Befehle SPARSAM für WOW-Momente:

- Element hervorheben: [[MORA_ACTION:{"type":"highlight","target":"#button-id"}]]
- Auf Planet zeigen: [[MORA_ACTION:{"type":"point","target":".planet-item"}]]
- Orb pulsieren lassen: [[MORA_ACTION:{"type":"pulse"}]]

Nutze dies nur wenn es dem User WIRKLICH hilft, z.B.:
- Wenn du auf etwas Wichtiges hinweisen willst
- Wenn der User etwas sucht und du zeigst wo es ist
- Für eindrucksvolle "Schau mal hier!" Momente`;


    if (context?.nodeTitle) {
        prompt += `\n\nAktueller Kontext:
- Node: "${context.nodeTitle}" (Type: ${context.nodeType || 'unknown'})`;
    } else if (context?.folderId) {
        prompt += `\n\nAktueller Kontext:
- Folder-Ebene (Folder ID: ${context.folderId})`;

        // Sprint Tag 2: Include Folder Nodes
        if (context?.folderNodes && context.folderNodes.length > 0) {
            prompt += `\n\nDieser Folder enthält ${context.folderNodes.length} Nodes:`;
            context.folderNodes.slice(0, 10).forEach((node: any) => {
                prompt += `\n- "${node.title}" (${node.type})`;
            });
            if (context.folderNodes.length > 10) {
                prompt += `\n- ... und ${context.folderNodes.length - 10} weitere`;
            }
        } else {
            prompt += `\n- Folder ist leer`;
        }
    } else if (context?.spaceId) {
        prompt += `\n\nAktueller Kontext:
- Space-Ebene (Space ID: ${context.spaceId})`;
    } else if (context?.departmentId) {
        prompt += `\n\nAktueller Kontext:
- Department-Ebene (Department ID: ${context.departmentId})`;
    } else {
        prompt += `\n\nAktueller Kontext:
- ROOT-Ebene (System Overview)`;
    }

    // Include Mindloop-Synthesis wenn vorhanden
    if (context?.mindloopSynthesis) {
        prompt += `\n\n## Intelligence Layer (Mindloop-Synthesis)
- Risk Level: ${context.mindloopSynthesis.risk_level || 'unknown'}
- Active Events: ${context.mindloopSynthesis.event_count || 0}
- Summary: ${context.mindloopSynthesis.summary || 'No synthesis available'}`;

        if (context.mindloopSynthesis.recommendations?.length > 0) {
            prompt += `\n- Recommendations:\n  ${context.mindloopSynthesis.recommendations.join('\n  ')}`;
        }
    }

    // Sprint Tag 3: Include Mindloop Events
    if (context?.mindloopEvents && context.mindloopEvents.length > 0) {
        prompt += `\n\n## Recent Activity (Mindloop Events)
Hier sind die letzten Aktivitäten in diesem Kontext:`;
        context.mindloopEvents.forEach((e: any) => {
            prompt += `\n- [${e.type}] ${e.timestamp}: ${e.summary}`;
        });
    }

    // Sprint Tag 4: Include Relations
    if (context?.relations && context.relations.length > 0) {
        prompt += `\n\n## Related Context (Relations)
This node is related to:`;
        context.relations.forEach((r: any) => {
            // Note: r.target is just an ID. Ideally we'd have the title, but heuristic service returns IDs.
            // MÔRA can at least see the connection exists.
            prompt += `\n- [${r.type}] -> Node ${r.target} (Strength: ${r.strength})`;
        });
    }

    prompt += `\n\nAntworte kurz, präzise und context-aware. Sei freundlich und hilfsbereit.`;

    return prompt;
}
