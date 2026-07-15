/**
 * PhysicsBalls Component
 * Physics-based navigation with gravity-enabled balls and falling characters
 */

import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { FOLDER_COLORS } from '@/components/Desktop';


interface PhysicsBallsProps {
  onSectionClick: (sectionId: string) => void;
  isBlurred?: boolean;
}

const sections = [
  { id: 'campaignevent', label: 'CAMPAIGNS AND EVENTS', size: 155 },
  { id: 'social', label: 'SOCIAL AND INTERACTIVE', size: 155 },
  { id: 'branddesign', label: 'BRAND DESIGN AND ILLUSTRATION', size: 155 },
  { id: 'about', label: 'INFO', size: 110 },
  { id: 'pottery', label: 'CERAMICS AND FURNITURE', size: 110 },
].map(s => ({ ...s, color: FOLDER_COLORS[s.id]?.bg || '#000000' }));

export default function PhysicsBalls({ onSectionClick, isBlurred }: PhysicsBallsProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const imageLoadedRef = useRef(false);
  const hoveredBallRef = useRef<Matter.Body | null>(null);


  useEffect(() => {
    if (!sceneRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create engine with NO GRAVITY for floating mode
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 0 }
    });
    
    // Reduce position iterations to make collisions less sticky
    engine.positionIterations = 8; // Default is 6
    engine.velocityIterations = 6; // Default is 4
    engineRef.current = engine;

    // Create renderer with pixel ratio for crisp rendering
    const pixelRatio = window.devicePixelRatio || 1;
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width,
        height,
        wireframes: false,
        background: 'transparent',
        showAngleIndicator: false,
        showVelocity: false,
        pixelRatio: pixelRatio,
      },
    });
    
    // Monkey-patch: disable ALL constraint rendering (prevents white anchor circle from MouseConstraint)
    (Matter.Render as any).constraints = () => {};

    // Scale canvas for high-DPI displays
    const canvas = render.canvas;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Separation force helper — applied on both collisionStart and collisionActive
    const applyBallCharSeparation = (event: any) => {
      event.pairs.forEach((pair: any) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        const isBallCharacterCollision =
          (bodyA.label && sections.find((s: any) => s.id === bodyA.label) && !bodyB.label) ||
          (bodyB.label && sections.find((s: any) => s.id === bodyB.label) && !bodyA.label);
        if (isBallCharacterCollision) {
          const normal = Matter.Vector.normalise(
            Matter.Vector.sub(bodyB.position, bodyA.position)
          );
          const separationForce = 0.02; // Strong push to keep them apart
          Matter.Body.applyForce(bodyA, bodyA.position, {
            x: -normal.x * separationForce,
            y: -normal.y * separationForce,
          });
          Matter.Body.applyForce(bodyB, bodyB.position, {
            x: normal.x * separationForce,
            y: normal.y * separationForce,
          });
        }
      });
    };
    Matter.Events.on(engine, 'collisionStart', applyBallCharSeparation);
    Matter.Events.on(engine, 'collisionActive', applyBallCharSeparation);

    // Create boundaries (all four walls) - positioned INSIDE viewport
    const wallThickness = 100;
    const walls = [
      // Bottom - top edge at viewport bottom
      Matter.Bodies.rectangle(width / 2, height - wallThickness / 2, width, wallThickness, {
        isStatic: true,
        render: { fillStyle: 'transparent' },
        collisionFilter: { category: 0x0004, mask: 0x0001 },
      }),
      // Left - right edge at viewport left
      Matter.Bodies.rectangle(wallThickness / 2, height / 2, wallThickness, height, {
        isStatic: true,
        render: { fillStyle: 'transparent' },
        collisionFilter: { category: 0x0004, mask: 0x0001 },
      }),
      // Right - left edge at viewport right
      Matter.Bodies.rectangle(width - wallThickness / 2, height / 2, wallThickness, height, {
        isStatic: true,
        render: { fillStyle: 'transparent' },
        collisionFilter: { category: 0x0004, mask: 0x0001 },
      }),
      // Top - bottom edge at viewport top
      Matter.Bodies.rectangle(width / 2, wallThickness / 2, width, wallThickness, {
        isStatic: true,
        render: { fillStyle: 'transparent' },
        collisionFilter: { category: 0x0004, mask: 0x0001 },
      }),
    ];

    Matter.World.add(engine.world, walls);

    // Create balls for sections - spread across viewport
    const balls: Matter.Body[] = [];
    sections.forEach((section, index) => {
      const x = 150 + (index * 180) % (width - 300);
      const radius = section.size / 2;
      // Random Y position across viewport for floating effect
      const y = 200 + Math.random() * (height - 400);

      const ball = Matter.Bodies.circle(x, y, radius, {
        restitution: 0.8, // Higher bounce for floating mode
        friction: 0.1, // Low friction for smooth floating
        density: 0.001, // Balanced density
        frictionAir: 0.01, // Gentle air resistance for natural drift
        render: {
          fillStyle: section.color,
          strokeStyle: 'transparent',
          lineWidth: 0,
        },
        label: section.id,
        collisionFilter: {
          category: 0x0002, // Balls category (not draggable)
          mask: 0x0001 | 0x0002 | 0x0004, // Collide with balls, characters, and walls
        },
        slop: 0.1, // Add small separation gap
      });

      // Add angular damping to slow down spinning
      Matter.Body.set(ball, { angularDamping: 0.05 });
      
      // Add gentle initial velocity for floating drift
      Matter.Body.setVelocity(ball, {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2
      });
      
      balls.push(ball);
      Matter.World.add(engine.world, ball);
    });

    // Preload character image before creating bodies
    const characterImage = new Image();
    let imageLoadFailed = false;
    characterImage.crossOrigin = 'anonymous';
    characterImage.onerror = () => { imageLoadFailed = true; };
    characterImage.src = '/assets/bruno_2fead422_b77b1a.png';
    
    const createCharacters = () => {
      const characters: Matter.Body[] = [];
      
      for (let i = 0; i < 7; i++) {
        // Spread characters evenly across width with random Y
        const x = (width / 8) * (i + 1) + (Math.random() - 0.5) * 50;
        // Random Y position across viewport for floating effect
        const y = 200 + Math.random() * (height - 400);
        const charWidth = 57; // Visual width for rendering (maintains 575:1503 aspect ratio)
        const charHeight = 149; // Visual height for rendering
        const charRadius = 75; // Circular physics body large enough to encompass the figure

        // Use CIRCLE body for floating physics
        const character = Matter.Bodies.circle(x, y, charRadius, {
          restitution: 0.8, // Higher bounce for floating mode
          friction: 0.1, // Low friction for smooth floating
          density: 0.001, // Same density as balls
          frictionAir: 0.01, // Gentle air resistance for natural drift
          render: {
            fillStyle: 'transparent',
            strokeStyle: 'transparent',
            lineWidth: 0,
          },
          collisionFilter: {
            category: 0x0001, // Characters category (draggable)
            mask: 0x0001 | 0x0002 | 0x0004, // Collide with balls, characters, and walls
          },
          slop: 0.1, // Add small separation gap
        });

        // Add angular damping to slow down spinning
        Matter.Body.set(character, { angularDamping: 0.05 });
        
        // Add gentle initial velocity for floating drift
        Matter.Body.setVelocity(character, {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2
        });
        
        characters.push(character);
        Matter.World.add(engine.world, character);
      }
      return characters;
    };

    // Wait for image to load before creating characters
    // Use a mutable reference so afterRender can access characters added later
    const charactersRef = { current: [] as Matter.Body[] };
    
    if (characterImage.complete) {
      charactersRef.current = createCharacters();
    } else {
      characterImage.onload = () => {
        charactersRef.current = createCharacters();
      };
    }

    // Mouse interaction - only allow dragging balls, not characters
    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false, lineWidth: 0, strokeStyle: 'transparent', anchors: false },
      },
      collisionFilter: {
        mask: 0x0001, // Only interact with characters (category 0x0001), not balls (0x0002)
      },
    });

    // Force-disable all rendering on the mouse constraint after creation
    // (Common.extend merge order means our options may not fully override defaults)
    if (mouseConstraint.constraint && mouseConstraint.constraint.render) {
      mouseConstraint.constraint.render.visible = false;
      mouseConstraint.constraint.render.lineWidth = 0;
      mouseConstraint.constraint.render.strokeStyle = 'transparent';
      (mouseConstraint.constraint.render as any).anchors = false;
    }

    Matter.World.add(engine.world, mouseConstraint);

    // Handle hover and clicks on balls
    Matter.Events.on(mouseConstraint, 'mousemove', (event) => {
      const mousePosition = event.mouse.position;
      const bodies = Matter.Query.point(engine.world.bodies, mousePosition);
      
      // Find if hovering over a ball
      const hoveredBall = bodies.find(body => 
        body.label && sections.find(s => s.id === body.label)
      );
      
      if (hoveredBall !== hoveredBallRef.current) {
        // Restore previous hovered ball to its original section color
        if (hoveredBallRef.current && hoveredBallRef.current.render) {
          const prevSection = sections.find(s => s.id === hoveredBallRef.current!.label);
          hoveredBallRef.current.render.fillStyle = prevSection?.color || '#000000';
          hoveredBallRef.current.render.strokeStyle = 'transparent';
        }
        
        // Darken on hover (add black overlay by using a darker version)
        if (hoveredBall && hoveredBall.render) {
          hoveredBall.render.fillStyle = '#000000'; // invert to black on hover
          hoveredBall.render.strokeStyle = 'transparent';
          render.canvas.style.cursor = 'pointer';
        } else {
          render.canvas.style.cursor = 'default';
        }
        
        hoveredBallRef.current = hoveredBall || null;
      }
    });

    Matter.Events.on(mouseConstraint, 'mousedown', (event) => {
      const mousePosition = event.mouse.position;
      const bodies = Matter.Query.point(engine.world.bodies, mousePosition);
      
      if (bodies.length > 0) {
        const clickedBody = bodies[0];
                if (clickedBody.label && sections.find(s => s.id === clickedBody.label)) {
          onSectionClick(clickedBody.label);
        }
      }
    });

    
    // Run engine and renderer
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);
    
    // Add velocity limiting and position clamping to keep objects within bounds
    Matter.Events.on(engine, 'beforeUpdate', () => {
      const allBodies = [...balls, ...charactersRef.current];
      allBodies.forEach(body => {
        // Limit velocity to prevent tunneling through walls
        const maxVelocity = 10; // Reduced from 15 for tighter control
        if (body.velocity.x > maxVelocity) Matter.Body.setVelocity(body, { x: maxVelocity, y: body.velocity.y });
        if (body.velocity.x < -maxVelocity) Matter.Body.setVelocity(body, { x: -maxVelocity, y: body.velocity.y });
        if (body.velocity.y > maxVelocity) Matter.Body.setVelocity(body, { x: body.velocity.x, y: maxVelocity });
        if (body.velocity.y < -maxVelocity) Matter.Body.setVelocity(body, { x: body.velocity.x, y: -maxVelocity });
        
        // Clamp position within bounds to keep all objects in viewport
        // Get body bounds to calculate proper padding
        const bodyBounds = body.bounds;
        const bodyWidth = bodyBounds.max.x - bodyBounds.min.x;
        const bodyHeight = bodyBounds.max.y - bodyBounds.min.y;
        // Since walls are now inside viewport, we only need padding for the wall thickness plus a small buffer
        const wallBuffer = 110; // Wall thickness (100) + small buffer (10)
        const paddingX = wallBuffer;
        const paddingY = wallBuffer;
        
        // Clamp all four sides to keep objects within viewport
        if (body.position.x < paddingX) Matter.Body.setPosition(body, { x: paddingX, y: body.position.y });
        if (body.position.x > width - paddingX) Matter.Body.setPosition(body, { x: width - paddingX, y: body.position.y });
        if (body.position.y < paddingY) Matter.Body.setPosition(body, { x: body.position.x, y: paddingY });
        if (body.position.y > height - paddingY) Matter.Body.setPosition(body, { x: body.position.x, y: height - paddingY });
      });
    });

    // Draw text labels and character sprites on canvas
    Matter.Events.on(render, 'afterRender', () => {
      const context = render.context;

      // Draw character sprites AFTER balls but use destination-over so character appears behind balls
      // We redraw the character using globalCompositeOperation = 'destination-over'
      // which places new drawing BEHIND existing canvas content (the balls)
      charactersRef.current.forEach((character: Matter.Body) => {
        if (!imageLoadFailed && characterImage.complete && characterImage.naturalWidth > 0) {
          context.save();
          context.globalCompositeOperation = 'destination-over';
          context.translate(character.position.x, character.position.y);
          context.rotate(character.angle);
          const displayWidth = 57 * pixelRatio;
          const displayHeight = 149 * pixelRatio;
          const charRadius = 75;
          const yOffset = charRadius - displayHeight / 2;
          context.drawImage(characterImage, -displayWidth / 2, yOffset, displayWidth, displayHeight);
          context.restore();
        }
      });

      // Draw ball labels on top (so they appear above everything)
      balls.forEach((ball, index) => {
        const section = sections[index];
        
        context.save();
        context.translate(ball.position.x, ball.position.y);
        
        // Allow slight rotation but prevent upside-down text
        let angle = ball.angle % (Math.PI * 2);
        // Normalize angle to -PI to PI range
        if (angle > Math.PI) angle -= Math.PI * 2;
        if (angle < -Math.PI) angle += Math.PI * 2;
        
        // Clamp rotation to ±60 degrees (±PI/3 radians)
        const maxTilt = Math.PI / 3; // 60 degrees
        const clampedAngle = Math.max(-maxTilt, Math.min(maxTilt, angle));
        context.rotate(clampedAngle);
        
        // Draw text with website-consistent typography
        // Invert text color when ball is inverted (white text on black ball)
        // Black text on colored balls; white text when ball is hovered (turns black)
        context.fillStyle = ball.render.fillStyle === '#000000' ? '#FFFFFF' : '#000000';
        // MoMA-style typography: Inter medium
        context.font = '500 13px "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        // Enable better text rendering
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        
        // Word wrap
        const words = section.label.split(' ');
        const maxWidth = section.size * 0.8;
        let lines: string[] = [];
        let currentLine = '';
        
        words.forEach(word => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = context.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);
        
        // Draw lines
        const lineHeight = 14;
        const totalHeight = lines.length * lineHeight;
        const startY = -totalHeight / 2 + lineHeight / 2;
        
        lines.forEach((line, i) => {
          context.fillText(line, 0, startY + i * lineHeight);
        });
        
        context.restore();
      });
    });

    // Cleanup
    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      render.canvas.remove();
    };
  }, []); // Empty deps - only run once on mount

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 1,
        filter: isBlurred ? 'blur(6px)' : 'none',
        transition: 'filter 0.25s ease',
      }}
    >
      <div ref={sceneRef} className="pointer-events-auto" />
    </div>
  );
}
