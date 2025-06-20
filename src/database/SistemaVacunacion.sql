-- Check if the database exists and use it; if not, create it
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SistemaVacunacion')
BEGIN
    CREATE DATABASE SistemaVacunacion;
END;
GO

-- Use the database
USE SistemaVacunacion;
GO

-- 1. Drop and recreate Paises table if it exists
IF OBJECT_ID('Paises', 'U') IS NOT NULL
    DROP TABLE Paises;
GO

CREATE TABLE Paises (
    id_pais UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(100) NOT NULL,
    gentilicio NVARCHAR(100) NOT NULL
);

-- 2. Drop and recreate Niños table if it exists
IF OBJECT_ID('Niños', 'U') IS NOT NULL
    DROP TABLE Niños;
GO

CREATE TABLE Niños (
    id_niño UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_completo NVARCHAR(200) NOT NULL,
    identificacion NVARCHAR(20) NOT NULL,
    nacionalidad UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Paises(id_pais),
    pais_nacimiento UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Paises(id_pais),
    fecha_nacimiento DATE NOT NULL,
    genero CHAR(1) NOT NULL CHECK (genero IN ('M', 'F', 'O')),
    direccion_residencia NVARCHAR(500) NULL,
    latitud DECIMAL(9,6) NULL,
    longitud DECIMAL(9,6) NULL,
    id_centro_salud UNIQUEIDENTIFIER NULL, -- Will reference Centros_Vacunacion later
    contacto_principal NVARCHAR(50) NULL CHECK (contacto_principal IN ('Madre', 'Padre', 'Tutor')),
    id_salud_nacional NVARCHAR(20) NULL,
    estado NVARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
    CONSTRAINT CHK_EdadMaxima CHECK (DATEDIFF(YEAR, fecha_nacimiento, GETDATE()) <= 14)
);

-- 3. Drop and recreate Tutores table if it exists
IF OBJECT_ID('Tutores', 'U') IS NOT NULL
    DROP TABLE Tutores;
GO

CREATE TABLE Tutores (
    id_tutor UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_niño UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Niños(id_niño) NOT NULL,
    nombre NVARCHAR(200) NOT NULL,
    relacion NVARCHAR(50) NOT NULL CHECK (relacion IN ('Madre', 'Padre', 'Tutor Legal')),
    nacionalidad UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Paises(id_pais),
    identificacion NVARCHAR(20) NULL,
    telefono NVARCHAR(20) NULL,
    email NVARCHAR(100) NULL CHECK (email LIKE '%@%.%'),
    direccion NVARCHAR(500) NULL,
    estado NVARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo'))
);

-- 4. Create Centros_Vacunacion table if it doesn't exist
IF OBJECT_ID('Centros_Vacunacion', 'U') IS NULL
CREATE TABLE Centros_Vacunacion (
    id_centro UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_centro NVARCHAR(200) NOT NULL,
    nombre_corto NVARCHAR(50) NULL,
    direccion NVARCHAR(500) NULL,
    latitud DECIMAL(9,6) NULL,
    longitud DECIMAL(9,6) NULL,
    telefono NVARCHAR(20) NULL,
    director NVARCHAR(200) NULL,
    sitio_web NVARCHAR(200) NULL CHECK (sitio_web LIKE 'http%'),
    estado NVARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo'))
);

-- 5. Create Personal_Salud table if it doesn't exist (moved earlier)
IF OBJECT_ID('Personal_Salud', 'U') IS NULL
CREATE TABLE Personal_Salud (
    id_personal UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(200) NOT NULL,
    cedula NVARCHAR(20) NOT NULL,
    telefono NVARCHAR(20) NULL,
    email NVARCHAR(100) NULL CHECK (email LIKE '%@%.%'),
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NOT NULL,
    especialidad NVARCHAR(100) NULL
);

-- 6. Create Vacunas table if it doesn't exist
IF OBJECT_ID('Vacunas', 'U') IS NULL
CREATE TABLE Vacunas (
    id_vacuna UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(100) NOT NULL,
    fabricante NVARCHAR(100) NOT NULL,
    tipo NVARCHAR(50) NOT NULL,
    dosis_requeridas INT NOT NULL
);

-- 7. Create Esquema_Vacunacion table if it doesn't exist
IF OBJECT_ID('Esquema_Vacunacion', 'U') IS NULL
CREATE TABLE Esquema_Vacunacion (
    id_esquema UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_vacuna UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Vacunas(id_vacuna) NOT NULL,
    orden_dosis INT NOT NULL,
    edad_recomendada NVARCHAR(50) NOT NULL,
    descripcion NVARCHAR(500) NULL
);

-- 8. Drop and recreate Calendarios_Nacionales table if it exists
IF OBJECT_ID('Calendarios_Nacionales', 'U') IS NOT NULL
    DROP TABLE Calendarios_Nacionales;
GO

CREATE TABLE Calendarios_Nacionales (
    id_calendario UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_pais UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Paises(id_pais) NOT NULL,
    descripcion NVARCHAR(500) NULL,
    id_esquema UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Esquema_Vacunacion(id_esquema) NOT NULL
);

-- 9. Create Lotes_Vacunas table if it doesn't exist
IF OBJECT_ID('Lotes_Vacunas', 'U') IS NULL
CREATE TABLE Lotes_Vacunas (
    id_lote UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_vacuna UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Vacunas(id_vacuna) NOT NULL,
    numero_lote NVARCHAR(50) NOT NULL,
    cantidad_total INT NOT NULL,
    cantidad_disponible INT NOT NULL,
    fecha_fabricacion DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NOT NULL,
    condiciones_almacenamiento NVARCHAR(250) NULL
);

-- 10. Create Historial_Vacunacion table if it doesn't exist
IF OBJECT_ID('Historial_Vacunacion', 'U') IS NULL
CREATE TABLE Historial_Vacunacion (
    id_historial UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_niño UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Niños(id_niño) NOT NULL,
    id_lote UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Lotes_Vacunas(id_lote) NOT NULL,
    id_personal UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Personal_Salud(id_personal) NOT NULL,
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NULL,
    fecha_vacunacion DATETIME2 NOT NULL,
    dosis_aplicada INT NOT NULL,
    sitio_aplicacion NVARCHAR(100) NULL,
    observaciones NVARCHAR(500) NULL
);

-- 11. Create Inventario_Suministros table if it doesn't exist
IF OBJECT_ID('Inventario_Suministros', 'U') IS NULL
CREATE TABLE Inventario_Suministros (
    id_suministro UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_suministro NVARCHAR(100) NOT NULL,
    tipo_suministro NVARCHAR(50) NULL,
    cantidad_total INT NOT NULL,
    cantidad_disponible INT NOT NULL,
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NOT NULL,
    fecha_entrada DATE NOT NULL,
    fecha_vencimiento DATE NULL,
    proveedor NVARCHAR(200) NULL,
    condiciones_almacenamiento NVARCHAR(200) NULL
);

-- 12. Create Campanas_Vacunacion table if it doesn't exist
IF OBJECT_ID('Campanas_Vacunacion', 'U') IS NULL
CREATE TABLE Campanas_Vacunacion (
    id_campaña UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_campaña NVARCHAR(200) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL,
    objetivo NVARCHAR(500) NULL,
    id_vacuna UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Vacunas(id_vacuna) NOT NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Planificada', 'En Curso', 'Finalizada'))
);

-- 13. Create Campana_Centro table if it doesn't exist
IF OBJECT_ID('Campana_Centro', 'U') IS NULL
CREATE TABLE Campana_Centro (
    id_campaña_centro UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_campaña UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Campanas_Vacunacion(id_campaña) NOT NULL,
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NOT NULL,
    fecha_asignacion DATE NOT NULL
);

-- 14. Create Usuarios table if it doesn't exist
IF OBJECT_ID('Usuarios', 'U') IS NULL
CREATE TABLE Usuarios (
    id_usuario UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(200) NOT NULL,
    rol NVARCHAR(50) NOT NULL CHECK (rol IN ('doctor', 'director', 'responsable', 'administrador')),
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NULL,
    username NVARCHAR(50) NOT NULL,
    password_hash NVARCHAR(500) NOT NULL,
    email NVARCHAR(100) NULL CHECK (email LIKE '%@%.%'),
    telefono NVARCHAR(20) NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Activo', 'Inactivo'))
);

-- 15. Create Auditoria table if it doesn't exist
IF OBJECT_ID('Auditoria', 'U') IS NULL
CREATE TABLE Auditoria (
    id_auditoria UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tabla_afectada NVARCHAR(100) NOT NULL,
    id_registro UNIQUEIDENTIFIER NOT NULL,
    id_usuario UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Usuarios(id_usuario) NOT NULL,
    accion NVARCHAR(20) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
    detalles NVARCHAR(500) NULL,
    ip_origen NVARCHAR(15) NULL,
    fecha_registro DATETIME2 NOT NULL
);

-- 16. Create Eventos_Adversos table if it doesn't exist
IF OBJECT_ID('Eventos_Adversos', 'U') IS NULL
CREATE TABLE Eventos_Adversos (
    id_evento UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_niño UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Niños(id_niño) NOT NULL,
    id_historial UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Historial_Vacunacion(id_historial) NOT NULL,
    descripcion_evento NVARCHAR(500) NOT NULL,
    fecha_evento DATE NOT NULL,
    gravedad NVARCHAR(20) NOT NULL CHECK (gravedad IN ('Leve', 'Moderado', 'Grave')),
    id_personal_reportante UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Personal_Salud(id_personal) NOT NULL,
    acciones_tomadas NVARCHAR(500) NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Reportado', 'En Investigación', 'Resuelto'))
);

-- 17. Create Alertas table if it doesn't exist
IF OBJECT_ID('Alertas', 'U') IS NULL
CREATE TABLE Alertas (
    id_alerta UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_niño UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Niños(id_niño) NOT NULL,
    tipo_alerta NVARCHAR(100) NOT NULL,
    fecha_alerta DATETIME2 NOT NULL,
    descripcion NVARCHAR(500) NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Pendiente', 'Resuelta'))
);

-- 18. Create Citas table if it doesn't exist
IF OBJECT_ID('Citas', 'U') IS NULL
CREATE TABLE Citas (
    id_cita UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_niño UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Niños(id_niño) NOT NULL,
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NOT NULL,
    fecha_cita DATETIME2 NOT NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Pendiente', 'Confirmada', 'Cancelada', 'Completada'))
);

-- Add foreign key constraint to Niños.id_centro_salud after Centros_Vacunacion is created
ALTER TABLE Niños
ADD CONSTRAINT FK_Niños_Centros_Vacunacion FOREIGN KEY (id_centro_salud) REFERENCES Centros_Vacunacion(id_centro);
GO